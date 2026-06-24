/**
 * STATE MACHINE GENERATOR
 *
 * Statically reifies a Vue SFC's reactive graph (see docs/foundations.md) into a
 * State-Flow Graph: every renderable state, its provenance (pull/backward-slice),
 * the actuators that flip it (push/dirty-mark), its form states and component
 * contracts. Zero AI, zero keyword matching — everything is derived from the
 * component's own symbols via the typed signal/event graph.
 *
 * The probe sees only the default-rendered state of each route; the state machine
 * enumerates ALL reachable states, so the two are complementary ground truth.
 */
import { parse as parseSfc } from '@vue/compiler-sfc'
import { writeFileSync, mkdirSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import type { Adapter } from '../../core/types'
import { FILES } from '../../core/constants'
import type { StateMachine, Transition, SignalSummary } from './types'
import { parseTemplate } from './parse-template'
import { parseForms } from './parse-forms'
import { extractSignals } from './graph/signals'
import { buildReactiveGraph, provenanceOf, actuatorsAffecting } from './graph/reactive-graph'
import { synthesizeScenarios } from './scenarios'
import { deriveContracts } from './derive-contract'

/** Parse one SFC into a state machine. Pure — does not touch disk. */
export function generateStateMachine (
  sfcPath: string,
  route: string,
  aliases: Record<string, string> = {}
): StateMachine {
  const { descriptor } = parseSfc(readFileSync(sfcPath, 'utf8'))
  const templateContent = descriptor.template?.content ?? ''
  const scriptContent = descriptor.scriptSetup?.content ?? descriptor.script?.content ?? ''

  // Build the typed reactive graph, then derive everything as graph traversals.
  const model = extractSignals(scriptContent, sfcPath, aliases)
  const graph = buildReactiveGraph(model, templateContent)

  const { states, components, texts } = parseTemplate(templateContent, (cond) => provenanceOf(graph, cond))
  const forms = parseForms(templateContent)

  // PUSH: which actuators flip each state → transitions (the State-Flow-Graph edges).
  const actuatorsByState = new Map<string, string[]>()
  const transitions: Transition[] = []
  for (const state of states) {
    if (state.isElse) continue
    const acting = actuatorsAffecting(graph, state.condition)
    const testids = [...new Set(acting.map((a) => a.testid).filter((t): t is string => !!t))]
    if (testids.length) actuatorsByState.set(state.id, testids)
    for (const a of acting) {
      transitions.push({ actuatorTestid: a.testid, via: a.via, signal: a.target, flipsStateIds: [state.id] })
    }
  }

  const componentContracts = deriveContracts(components, model.importMap, sfcPath, aliases)
  const scenarios = synthesizeScenarios(states, forms, actuatorsByState)

  const signals: SignalSummary[] = [...graph.signals.values()].map((s) => ({
    name: s.name,
    kind: s.kind,
    userMutable: s.userMutable
  }))

  return {
    file: sfcPath,
    route,
    states,
    forms,
    components,
    componentContracts,
    signals,
    transitions,
    props: model.props,
    storesUsed: model.storesUsed,
    texts,
    localImports: model.localImports,
    globalImports: model.globalImports,
    scenarios
  }
}

/** Every testid the state machine knows can render — across all states/forms/components. */
export function stateMachineTestids (machines: StateMachine[]): string[] {
  const ids = new Set<string>()
  for (const m of machines) {
    for (const s of m.states) s.visibleTestids.forEach((id) => ids.add(id))
    for (const f of m.forms) {
      if (f.formTestid) ids.add(f.formTestid)
      if (f.submitTestid) ids.add(f.submitTestid)
      for (const field of f.fields) {
        if (field.testid && field.testid !== 'unknown') ids.add(field.testid)
        if (field.errorTestid) ids.add(field.errorTestid)
      }
    }
    for (const c of m.components) if (c.testid) ids.add(c.testid)
  }
  return [...ids]
}

/**
 * Aggregate stage: parse every routed SFC (deduped) into a state machine and
 * write the array to state-machine.json. Deterministic — no AI, no network.
 */
export function runStateMachine (outDir: string, adapter: Adapter): StateMachine[] {
  const seen = new Set<string>()
  const machines: StateMachine[] = []
  const aliases = adapter.aliases ?? {}

  for (const route of adapter.routes) {
    if (!route.sfc || seen.has(route.sfc)) continue
    seen.add(route.sfc)
    try {
      const machine = generateStateMachine(resolve(route.sfc), route.path, aliases)
      machines.push(machine)
      console.log(`  ✓ ${route.sfc} — ${machine.states.length} states, ${machine.scenarios.length} scenarios`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ✗ ${route.sfc}: ${msg}`)
    }
  }

  const out = resolve(outDir, FILES.STATE_MACHINE)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, JSON.stringify(machines, null, 2))
  console.log(`statemachine → ${out}`)

  return machines
}
