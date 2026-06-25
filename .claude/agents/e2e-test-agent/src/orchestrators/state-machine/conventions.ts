import type { ComponentProp, ComponentStateContract } from './types'

/**
 * Generic prop → state vocabulary. This is the small, stable convention set that
 * replaces a hand-maintained per-component manifest: a state-bearing prop means
 * the same thing on ANY component (a DS primitive or a custom Pinia wrapper).
 * Add a convention once and every component benefits — it scales to a monorepo,
 * a 52-row table does not.
 */
interface Convention {
  prop: string
  name: string
  assertion: string
}

const CONVENTIONS: Convention[] = [
  { prop: 'disabled', name: 'disabled', assertion: 'has the disabled attribute; interaction is a no-op' },
  { prop: 'loading', name: 'loading', assertion: 'busy/loading indicator shown; interaction suppressed' },
  { prop: 'error', name: 'error', assertion: 'error styling present and message rendered' },
  { prop: 'readonly', name: 'readonly', assertion: 'value visible but not editable' },
  { prop: 'required', name: 'required', assertion: 'empty submit surfaces a required-field error' },
  { prop: 'active', name: 'active', assertion: 'active styling applied' },
  { prop: 'selected', name: 'selected', assertion: 'selected value/styling applied' },
  { prop: 'checked', name: 'checked', assertion: 'control reflects the checked state' },
  { prop: 'open', name: 'open', assertion: 'expanded content is visible' },
  { prop: 'variant', name: 'variant', assertion: 'styling matches the bound variant value' },
  { prop: 'type', name: 'type', assertion: 'renders the control for the bound type' }
]

const BY_PROP = new Map(CONVENTIONS.map((c) => [c.prop, c]))

/** Derive the states implied by the state-bearing props bound at a call site. */
export function deriveConventionStates (props: ComponentProp[]): ComponentStateContract[] {
  const states: ComponentStateContract[] = []
  for (const prop of props) {
    const convention = BY_PROP.get(prop.name)
    if (!convention) continue
    const trigger = prop.bound && prop.value
      ? `${prop.name}="${prop.value}"`
      : `${prop.name} prop`
    states.push({ name: convention.name, triggeredBy: trigger, assertion: convention.assertion })
  }
  return states
}
