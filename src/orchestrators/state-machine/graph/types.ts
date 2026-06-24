/**
 * The typed reactive graph — see docs/foundations.md.
 * Nodes are SIGNALS (continuous state) or come from EVENTS (manually-triggerable
 * actuators). Provenance and transitions are graph traversals, never keyword matches.
 */

export type SignalKind = 'ref' | 'reactive' | 'computed' | 'prop' | 'route' | 'store' | 'composable'

/** Where a guard's data ultimately originates — the pull/backward-slice classification. */
export type Provenance = 'route' | 'prop' | 'store' | 'user-input' | 'data' | 'unknown'

export interface Signal {
  name: string
  kind: SignalKind
  /** names of other signals this reads (def-use edges, upstream). */
  deps: string[]
  /** a v-model or event handler can write this signal (an event source). */
  userMutable: boolean
}

/** An event source: the thing a tester drives to change a signal. */
export interface Actuator {
  via: string // 'v-model' or an event name like 'click'
  target: string // the signal name it writes
  testid: string | null // the element to interact with
}

export interface ReactiveGraph {
  signals: Map<string, Signal>
  actuators: Actuator[]
}

/** A property-access chain, e.g. `store.booking.name` → { root: 'store', leaf: 'name' }. */
export interface AccessChain {
  root: string
  leaf: string
}

export interface ExprRefs {
  /** base identifiers read by the expression (for provenance lookup). */
  roots: string[]
  /** maximal property-access chains (for structural symbol correlation). */
  accesses: AccessChain[]
}
