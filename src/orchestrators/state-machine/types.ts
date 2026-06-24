import type { Provenance, SignalKind } from './graph/types'

export interface StateNode {
  id: string
  condition: string
  isElse: boolean
  visibleTestids: string[]
  /** Where this state's guard data originates — derived by the pull/backward-slice. */
  provenance: Provenance
  depth: number
  parentCondition: string | null
  /**
   * Identifies the v-if / v-else-if / v-else CHAIN this node belongs to.
   * Only nodes sharing a chainId are mutually exclusive. Independent v-if blocks
   * at the same nesting level get distinct chainIds, so they are NOT treated as
   * alternatives (e.g. `v-if="featured"` and `v-if="seats > 0"` can both render).
   */
  chainId: string
}

export interface ValidationField {
  testid: string
  name: string
  required: boolean
  errorTestid: string | null
}

export interface FormState {
  formTestid: string
  submitTestid: string | null
  /** the signal expression gating the submit button's :disabled, if any. */
  submitGatedBy: string | null
  fields: ValidationField[]
}

export interface ComponentProp {
  name: string
  bound: boolean
  value: string | null
}

/** A component element as USED on a page (call site): its tag, testid and bound props. */
export interface ComponentUsage {
  component: string
  testid: string | null
  props: ComponentProp[]
}

export interface ComponentStateContract {
  name: string
  triggeredBy: string
  assertion: string
}

/**
 * The state contract for a component — AUTO-DERIVED, never hand-maintained.
 *  - 'convention': inferred from the state-bearing props bound at the call site
 *  - 'sfc': discovered by resolving and parsing the component's own source
 *  - 'sfc+convention': both
 */
export interface ComponentContract {
  component: string
  source: 'convention' | 'sfc' | 'sfc+convention'
  states: ComponentStateContract[]
}

/** A reactive source surfaced in the machine output (for inspection/prompts). */
export interface SignalSummary {
  name: string
  kind: SignalKind
  userMutable: boolean
}

/**
 * An event→state edge: driving `actuatorTestid` changes `signal`, which (by the
 * push/dirty-mark) can flip the listed states. This is the State-Flow-Graph edge —
 * derived generically, replacing the old keyword "search/filter" detection.
 */
export interface Transition {
  actuatorTestid: string | null
  via: string
  signal: string
  flipsStateIds: string[]
}

export interface StateMachine {
  file: string
  route: string
  states: StateNode[]
  forms: FormState[]
  components: ComponentUsage[]
  componentContracts: ComponentContract[]
  signals: SignalSummary[]
  transitions: Transition[]
  props: string[]
  storesUsed: string[]
  texts: Record<string, string>
  localImports: string[]
  globalImports: string[]
  scenarios: Scenario[]
}

export interface Scenario {
  id: string
  provenance: Provenance
  description: string
  setup: string
  expectVisible: string[]
  expectAbsent: string[]
  vrtCheckpoint: boolean
}
