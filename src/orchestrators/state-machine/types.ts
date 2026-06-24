export type TriggerKind = 'route' | 'user-action' | 'data' | 'validation'

export interface StateNode {
  id: string
  condition: string
  isElse: boolean
  visibleTestids: string[]
  triggerKind: TriggerKind
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
  states: ['untouched', 'invalid', 'valid']
}

export interface FormState {
  formTestid: string
  submitTestid: string | null
  submitGatedBy: string | null
  fields: ValidationField[]
  usesVeeValidate: boolean
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

export interface FilterControl {
  testid: string
  name: string
  affectsComputed: string | null
}

export interface SearchState {
  filters: FilterControl[]
  resultsTestid: string | null
  emptyTestid: string | null
  resultComputed: string | null
}

export interface ComputedDep {
  name: string
  deps: string[]
}

export interface StateMachine {
  file: string
  route: string
  states: StateNode[]
  forms: FormState[]
  components: ComponentUsage[]
  componentContracts: ComponentContract[]
  search: SearchState | null
  computeds: ComputedDep[]
  props: string[]
  storesUsed: string[]
  texts: Record<string, string>
  localImports: string[]
  globalImports: string[]
  scenarios: Scenario[]
}

export interface Scenario {
  id: string
  kind: TriggerKind
  description: string
  setup: string
  expectVisible: string[]
  expectAbsent: string[]
  vrtCheckpoint: boolean
}
