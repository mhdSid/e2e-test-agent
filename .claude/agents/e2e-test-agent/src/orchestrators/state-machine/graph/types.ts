/**
 * The typed reactive graph — see docs/foundations.md.
 * Nodes are SIGNALS (continuous state) or come from EVENTS (manually-triggerable
 * actuators). Provenance and transitions are graph traversals, never keyword matches.
 */

export type SignalKind = 'ref' | 'reactive' | 'computed' | 'prop' | 'route' | 'store' | 'composable'

/** Where a guard's data ultimately originates — the pull/backward-slice classification. */
export type Provenance = 'route' | 'prop' | 'store' | 'user-input' | 'validation' | 'data' | 'unknown'

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

/** A property-access chain, e.g. `store.booking.name` → { root:'store', path:['booking','name'], full:'store.booking.name' }. */
export interface AccessChain {
  root: string
  /** the full property path after the root, e.g. ['booking','name'] for store.booking.name */
  path: string[]
  /** the leaf property — last segment, kept for backward compatibility */
  leaf: string
  /** the complete dotted access, e.g. 'store.booking.name' */
  full: string
}

/** A comparison the guard makes: the satisfying-assignment recipe. */
export interface Comparison {
  /** the full access being compared, e.g. 'store.reservation.status' */
  access: string
  /** the operator: ===, !==, >, >=, <, <=, truthy, falsy */
  operator: string
  /** the literal compared against, or null for truthy/falsy checks */
  value: string | null
}

export interface ExprRefs {
  /** base identifiers read by the expression (for provenance lookup). */
  roots: string[]
  /** maximal property-access chains (for structural symbol correlation). */
  accesses: AccessChain[]
  /** comparisons made — what fields at what values trigger this guard. */
  comparisons: Comparison[]
}
