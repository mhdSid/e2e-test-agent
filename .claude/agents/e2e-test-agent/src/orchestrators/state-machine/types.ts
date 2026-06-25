import type { Provenance, SignalKind, Comparison } from './graph/types'

/** The concrete trigger for a state: a field, an operator, and a target value. */
export type StateRecipe = Comparison

export interface StateNode {
  id: string
  condition: string
  isElse: boolean
  visibleTestids: string[]
  /** Where this state's guard data originates — derived by the pull/backward-slice. */
  provenance: Provenance
  /**
   * The satisfying-assignment recipe: which fields at which values trigger this
   * state. Derived from the guard expression — the concrete test setup for
   * computed/store-driven pages. For an `else`, these are the negated form.
   */
  recipe: StateRecipe[]
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
  /** route this form's submit navigates to (router.push), if any. */
  submitNavigatesTo: string | null
  /** true when the form has a validity gate or error elements (structural, library-agnostic). */
  validated: boolean
  /** signals that gate submit or drive an error element — feed validation-provenance detection. */
  validationRoots: string[]
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

/**
 * Deterministic steps to drive the app into a state — derived from the reactive graph
 * (within-component actuators) and cross-route navigation edges (a form elsewhere whose
 * submit router.push-es here). This is reachability the RDG hands the generator/repair,
 * instead of the LLM guessing the journey.
 */
export interface Journey {
  stateId: string
  steps: string[]
  /** true when reaching the state requires a journey from another route. */
  crossRoute: boolean
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
  journeys: Journey[]
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
