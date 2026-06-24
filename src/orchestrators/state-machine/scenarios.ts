import type {
  StateNode,
  FormState,
  SearchState,
  Scenario,
  ComputedDep
} from './types'

/**
 * Deterministic scenario synthesis from the parsed facts.
 * No AI. Each scenario names its trigger, expected selectors, and VRT need.
 */

function stateScenarios (states: StateNode[]): Scenario[] {
  return states.map((state, i) => {
    // Only states in the SAME v-if/v-else-if/v-else chain are mutually exclusive.
    // Independent v-if blocks at the same level can co-render, so they must NOT
    // appear in each other's expectAbsent set.
    const siblings = states.filter(
      (s) => s.id !== state.id && s.chainId === state.chainId
    )
    const expectAbsent = siblings.flatMap((s) => s.visibleTestids)
      .filter((id) => !state.visibleTestids.includes(id))

    return {
      id: `state-${i}`,
      kind: state.triggerKind,
      description: state.isElse
        ? `renders fallback branch`
        : `renders when: ${state.condition}`,
      setup: state.isElse
        ? `provide input so no prior condition matches`
        : `provide input satisfying: ${state.condition}`,
      expectVisible: state.visibleTestids,
      expectAbsent: [...new Set(expectAbsent)],
      vrtCheckpoint: true
    }
  })
}

function formScenarios (forms: FormState[]): Scenario[] {
  const scenarios: Scenario[] = []

  for (const form of forms) {
    // empty submit → all required errors visible
    const requiredErrors = form.fields
      .filter((f) => f.required && f.errorTestid)
      .map((f) => f.errorTestid as string)

    if (requiredErrors.length > 0) {
      scenarios.push({
        id: `form-empty-submit`,
        kind: 'validation',
        description: `submit empty form → required field errors appear`,
        setup: `click ${form.submitTestid} without filling fields`,
        expectVisible: requiredErrors,
        expectAbsent: [],
        vrtCheckpoint: true
      })
    }

    // per-field invalid then valid
    for (const field of form.fields) {
      if (field.errorTestid) {
        scenarios.push({
          id: `field-${field.name}-invalid`,
          kind: 'validation',
          description: `${field.name} invalid → error message shows`,
          setup: `fill ${field.testid} with invalid value, blur`,
          expectVisible: [field.errorTestid],
          expectAbsent: [],
          vrtCheckpoint: false
        })
        scenarios.push({
          id: `field-${field.name}-valid`,
          kind: 'validation',
          description: `${field.name} valid → error message hidden`,
          setup: `fill ${field.testid} with valid value, blur`,
          expectVisible: [],
          expectAbsent: [field.errorTestid],
          vrtCheckpoint: false
        })
      }
    }

    // all valid → submission proceeds. A submit that navigates away REMOVES the
    // button, so a gated form asserts the button is enabled BEFORE submit, and an
    // ungated form asserts the resulting destination AFTER submit — never the
    // submit button itself post-click.
    if (form.submitTestid) {
      scenarios.push(form.submitGatedBy
        ? {
            id: `form-valid-submit`,
            kind: 'validation',
            description: `all fields valid → submit becomes enabled (gated by ${form.submitGatedBy})`,
            setup: `fill all fields with valid values, then assert ${form.submitTestid} is enabled (do not click)`,
            expectVisible: [form.submitTestid],
            expectAbsent: [],
            vrtCheckpoint: true
          }
        : {
            id: `form-valid-submit`,
            kind: 'validation',
            description: `all fields valid → submitting proceeds to the next state`,
            setup: `fill all fields with valid values and click ${form.submitTestid}; assert the resulting page/URL, NOT the submit button (the form navigates away)`,
            expectVisible: [],
            expectAbsent: [],
            vrtCheckpoint: true
          })
    }
  }

  return scenarios
}

function searchScenarios (search: SearchState | null): Scenario[] {
  if (!search) return []
  const scenarios: Scenario[] = []

  // each filter independently (NOT the cross product)
  for (const filter of search.filters) {
    scenarios.push({
      id: `filter-${filter.name}`,
      kind: 'user-action',
      description: `applying ${filter.name} filter narrows results`,
      setup: `set ${filter.testid}, leave other filters empty`,
      expectVisible: search.resultsTestid ? [search.resultsTestid] : [],
      expectAbsent: [],
      vrtCheckpoint: false
    })
  }

  // empty result state. Do NOT assert the results container absent: it is often
  // gated on the query (v-if="query"), not on having results, so an empty list
  // element can still be present. Assert the empty marker + zero result items.
  if (search.emptyTestid) {
    scenarios.push({
      id: `search-empty`,
      kind: 'user-action',
      description: `filters matching nothing → empty state, zero result items`,
      setup: `set filters that match no items`,
      expectVisible: [search.emptyTestid],
      expectAbsent: [],
      vrtCheckpoint: true
    })
  }

  return scenarios
}

export function synthesizeScenarios (
  states: StateNode[],
  forms: FormState[],
  search: SearchState | null,
  _computeds: ComputedDep[]
): Scenario[] {
  return [
    ...stateScenarios(states),
    ...formScenarios(forms),
    ...searchScenarios(search)
  ]
}
