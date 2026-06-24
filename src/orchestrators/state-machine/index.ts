/**
 * STATE MACHINE GENERATOR
 *
 * Parses a Vue SFC (template + script) and emits a deterministic state machine:
 * every renderable state, its trigger, its selectors, plus VeeValidate form
 * states, DS elements, and search filters.
 *
 * Zero AI. This is ground truth the downstream AI reasons against. The probe sees
 * only the default-rendered state of each route; the state machine enumerates ALL
 * reachable states (including branches a direct navigation can't reach), so the
 * two are complementary inputs to plan + generate.
 *
 * Handles the real Gora page shapes:
 *   - design-system components (G-prefixed)
 *   - VeeValidate forms (useForm/useField/ErrorMessage, meta.valid gating)
 *   - client-side validation states (untouched → invalid → valid)
 *   - search pages with filters (tested independently, not combinatorially)
 *   - v-if/v-else-if/v-else chains with real preserved conditions
 */
import { parse as parseSfc } from '@vue/compiler-sfc'
import { writeFileSync, mkdirSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import type { Adapter } from '../../core/types'
import { FILES } from '../../core/constants'
import type { StateMachine, SearchState, FilterControl, FormState, ComputedDep } from './types'
import { parseTemplate } from './parse-template'
import { parseForms } from './parse-forms'
import { parseScript } from './parse-script'
import { synthesizeScenarios } from './scenarios'
import { deriveContracts } from './derive-contract'
import { FILTER_INPUT_HINTS } from './constants'

function matchesFilterHint (value: string): boolean {
  const v = value.toLowerCase()
  return FILTER_INPUT_HINTS.some((hint) => v.includes(hint))
}

/**
 * A filter is a real bound input (a parsed form field), not any testid that
 * happens to contain "search". The old heuristic matched the page root, title,
 * <form> and submit button too, inventing bogus filter scenarios — so we key off
 * the form fields the script actually binds.
 */
function detectSearch (
  forms: FormState[],
  allTestids: string[],
  computeds: ComputedDep[]
): SearchState | null {
  const fields = forms.flatMap((f) => f.fields)
  const filterFields = fields.filter(
    (f) => matchesFilterHint(f.testid) || matchesFilterHint(f.name)
  )
  if (filterFields.length === 0) return null

  const resultComputed =
    computeds.find((c) => c.name.includes('result') || c.name.includes('filtered'))?.name ?? null

  const filters: FilterControl[] = filterFields.map((f) => ({
    testid: f.testid,
    name: f.name,
    affectsComputed: resultComputed
  }))

  const resultsTestid = allTestids.find((id) => id.includes('result-list') || id.includes('results')) ?? null
  const emptyTestid = allTestids.find((id) => id.includes('empty') || id.includes('no-result')) ?? null

  return { filters, resultsTestid, emptyTestid, resultComputed }
}

/** Parse one SFC into a state machine. Pure — does not touch disk. */
export function generateStateMachine (
  sfcPath: string,
  route: string,
  aliases: Record<string, string> = {}
): StateMachine {
  const source = readFileSync(sfcPath, 'utf8')
  const { descriptor } = parseSfc(source)

  const templateContent = descriptor.template?.content ?? ''
  const scriptContent = descriptor.scriptSetup?.content ?? descriptor.script?.content ?? ''

  const { states, components, allTestids, texts } = parseTemplate(templateContent)
  const forms = parseForms(templateContent, scriptContent)
  const { computeds, localImports, globalImports, importMap, props, storesUsed } = parseScript(scriptContent)

  // Contracts are auto-derived (conventions + resolved SFCs), never looked up in a table.
  const componentContracts = deriveContracts(components, importMap, sfcPath, aliases)
  const search = detectSearch(forms, allTestids, computeds)
  const scenarios = synthesizeScenarios(states, forms, search, computeds)

  return {
    file: sfcPath,
    route,
    states,
    forms,
    components,
    componentContracts,
    search,
    computeds,
    props,
    storesUsed,
    texts,
    localImports,
    globalImports,
    scenarios
  }
}

/** Every testid the state machine knows can render — across all states/forms/search. */
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
    if (m.search) {
      m.search.filters.forEach((f) => ids.add(f.testid))
      if (m.search.resultsTestid) ids.add(m.search.resultsTestid)
      if (m.search.emptyTestid) ids.add(m.search.emptyTestid)
    }
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
