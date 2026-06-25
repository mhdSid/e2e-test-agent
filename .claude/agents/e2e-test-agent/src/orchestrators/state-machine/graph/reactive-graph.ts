import { parse } from '@vue/compiler-dom'
import { analyzeExpression } from './expression'
import type { ReactiveGraph, Signal, Actuator, Provenance } from './types'
import type { ScriptModel } from './signals'
import { NODE_TYPE, PROP_TYPE, DIRECTIVES, TESTID_ATTR } from '../constants'

// Highest-priority provenance wins when a guard mixes sources.
const PRIORITY: Provenance[] = ['route', 'store', 'prop', 'user-input', 'data', 'unknown']

function stripQuotes (s: string): string {
  return s.replace(/^['"`]|['"`]$/g, '')
}

/**
 * An element's testid: a literal `data-testid`, or the configured directive
 * (`v-testable="'x'"` → "x"). Mirrors parse-template so actuators on directive-tagged
 * elements get the same selector the probe/state machine see — without this, every
 * actuator on a v-testable element (i.e. all of real Gora) would have a null testid.
 */
function getTestid (node: any, directive: string): string | null {
  const attr = node.props?.find((p: any) => p.name === TESTID_ATTR)?.value?.content
  if (attr) return attr
  if (directive) {
    const dir = node.props?.find((p: any) => p.type === PROP_TYPE.DIRECTIVE && p.name === directive)
    const raw = dir?.exp?.content ?? dir?.arg?.content
    if (raw) return stripQuotes(raw)
  }
  return null
}

function rootOf (expr: string | undefined): string | null {
  if (!expr) return null
  return analyzeExpression(expr).roots[0] ?? null
}

/**
 * Walk the template for EVENT SOURCES (actuators): `v-model` writes a signal, and a
 * `@event` whose handler mutates signals (looked up in handlerMutations) writes them
 * too. Each actuator marks its target signal user-mutable — that is what later makes a
 * guard reading it classify as `user-input`.
 */
function collectActuators (
  node: any,
  model: ScriptModel,
  signals: Map<string, Signal>,
  out: Actuator[],
  directive: string
): void {
  if (node.type === NODE_TYPE.ELEMENT) {
    const testid = getTestid(node, directive)
    for (const prop of node.props ?? []) {
      if (prop.name === DIRECTIVES.MODEL) {
        const target = rootOf(prop.exp?.content)
        if (target) {
          markMutable(signals, target)
          out.push({ via: 'v-model', target, testid })
        }
      } else if (prop.name === DIRECTIVES.ON && prop.arg?.content) {
        const handler = rootOf(prop.exp?.content)
        const mutated = handler ? model.handlerMutations[handler] ?? [] : []
        for (const target of mutated) {
          markMutable(signals, target)
          out.push({ via: prop.arg.content, target, testid })
        }
      }
    }
  }
  for (const child of node.children ?? []) collectActuators(child, model, signals, out, directive)
}

function markMutable (signals: Map<string, Signal>, name: string): void {
  const s = signals.get(name)
  if (s) s.userMutable = true
}

export function buildReactiveGraph (
  model: ScriptModel,
  templateContent: string,
  testidDirective = 'testable'
): ReactiveGraph {
  const signals = model.signals
  const actuators: Actuator[] = []
  const ast = parse(templateContent)
  for (const child of ast.children ?? []) collectActuators(child, model, signals, actuators, testidDirective)
  return { signals, actuators }
}

// ── pull: provenance (backward slice) ────────────────────────────────────────

function provenanceOfSignal (graph: ReactiveGraph, name: string, seen: Set<string>): Provenance[] {
  if (seen.has(name)) return []
  seen.add(name)
  const s = graph.signals.get(name)
  if (!s) return []

  switch (s.kind) {
    case 'route': return ['route']
    case 'store': return ['store']
    case 'prop': return ['prop']
    case 'composable': return ['user-input']
    case 'loading-gate': return ['data'] // flipped by an async/lifecycle hook, not user input
    case 'ref':
    case 'reactive':
      return [s.userMutable ? 'user-input' : 'data']
    case 'computed': {
      const inner = s.deps.flatMap((d) => provenanceOfSignal(graph, d, seen))
      return inner.length ? inner : ['data']
    }
  }
}

function combine (provs: Provenance[]): Provenance {
  for (const p of PRIORITY) if (provs.includes(p)) return p
  return 'data'
}

/**
 * PULL: classify a guard expression by tracing its signal roots to their source kinds.
 *
 * `validationSignals` are signals that play the structural VALIDATION role — they gate
 * a form's submit (`:disabled`) or drive an error element (`v-if`). A guard reading one
 * is `validation`. This is derived from the graph + form structure (see index.ts), NOT
 * from matching `errors.`/`meta.` in the text — so it is library-agnostic and works for
 * a custom `isValid` exactly as for vee-validate's `meta.valid`.
 */
export function provenanceOf (
  graph: ReactiveGraph,
  expr: string,
  validationSignals: ReadonlySet<string> = new Set()
): Provenance {
  const roots = analyzeExpression(expr).roots
  if (roots.some((r) => validationSignals.has(r))) return 'validation'
  const seen = new Set<string>()
  const provs = roots.flatMap((r) => provenanceOfSignal(graph, r, seen))
  return provs.length ? combine(provs) : 'data'
}

// ── push: dirty-mark (forward reachability) ──────────────────────────────────

function dependentsMap (graph: ReactiveGraph): Map<string, string[]> {
  const deps = new Map<string, string[]>()
  for (const s of graph.signals.values()) {
    for (const d of s.deps) {
      const list = deps.get(d) ?? []
      list.push(s.name)
      deps.set(d, list)
    }
  }
  return deps
}

/** PUSH: every signal reachable downstream from `start` (itself + transitive dependents). */
function reachableSignals (graph: ReactiveGraph, start: string): Set<string> {
  const dependents = dependentsMap(graph)
  const seen = new Set<string>([start])
  const queue = [start]
  while (queue.length) {
    const cur = queue.shift() as string
    for (const next of dependents.get(cur) ?? []) {
      if (!seen.has(next)) {
        seen.add(next)
        queue.push(next)
      }
    }
  }
  return seen
}

/** Actuators that can flip a guard: their target signal reaches one of the guard's roots. */
export function actuatorsAffecting (graph: ReactiveGraph, expr: string): Actuator[] {
  const guardRoots = new Set(analyzeExpression(expr).roots)
  return graph.actuators.filter((a) => {
    for (const reached of reachableSignals(graph, a.target)) {
      if (guardRoots.has(reached)) return true
    }
    return false
  })
}
