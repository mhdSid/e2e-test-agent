import { parse } from '@vue/compiler-dom'
import { analyzeExpression } from './expression'
import type { ReactiveGraph, Signal, Actuator, Provenance } from './types'
import type { ScriptModel } from './signals'
import { NODE_TYPE, DIRECTIVES, TESTID_ATTR } from '../constants'

// Highest-priority provenance wins when a guard mixes sources.
const PRIORITY: Provenance[] = ['route', 'store', 'prop', 'user-input', 'data', 'unknown']

function getTestid (node: any): string | null {
  return node.props?.find((p: any) => p.name === TESTID_ATTR)?.value?.content ?? null
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
function collectActuators (node: any, model: ScriptModel, signals: Map<string, Signal>, out: Actuator[]): void {
  if (node.type === NODE_TYPE.ELEMENT) {
    const testid = getTestid(node)
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
  for (const child of node.children ?? []) collectActuators(child, model, signals, out)
}

function markMutable (signals: Map<string, Signal>, name: string): void {
  const s = signals.get(name)
  if (s) s.userMutable = true
}

export function buildReactiveGraph (model: ScriptModel, templateContent: string): ReactiveGraph {
  const signals = model.signals
  const actuators: Actuator[] = []
  const ast = parse(templateContent)
  for (const child of ast.children ?? []) collectActuators(child, model, signals, actuators)
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

/** PULL: classify a guard expression by tracing its signal roots to their source kinds. */
export function provenanceOf (graph: ReactiveGraph, expr: string): Provenance {
  const roots = analyzeExpression(expr).roots
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
