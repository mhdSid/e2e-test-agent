import type { StateNode, FormState, Scenario } from './types'

/**
 * Deterministic scenario synthesis from the parsed facts + the reactive graph.
 * No AI, no keywords. Each scenario names its provenance, how to reach the state
 * (the driving actuator, when one exists), its selectors, and its VRT need.
 */

function reachSetup (state: StateNode, actuators: string[]): string {
  if (state.isElse) return 'provide input so no sibling condition in the chain matches'
  if (actuators.length) return `drive [${actuators.join(', ')}] so that: ${state.condition}`
  return `reach the state where: ${state.condition} (provenance: ${state.provenance})`
}

function stateScenarios (states: StateNode[], actuatorsByState: Map<string, string[]>): Scenario[] {
  return states.map((state, i) => {
    // Only states in the SAME v-if/else chain are mutually exclusive.
    const siblings = states.filter((s) => s.id !== state.id && s.chainId === state.chainId)
    const expectAbsent = siblings
      .flatMap((s) => s.visibleTestids)
      .filter((id) => !state.visibleTestids.includes(id))

    return {
      id: `state-${i}`,
      provenance: state.provenance,
      description: state.isElse ? 'renders fallback branch' : `renders when: ${state.condition}`,
      setup: reachSetup(state, actuatorsByState.get(state.id) ?? []),
      expectVisible: state.visibleTestids,
      expectAbsent: [...new Set(expectAbsent)],
      vrtCheckpoint: true
    }
  })
}

function formScenarios (forms: FormState[]): Scenario[] {
  const scenarios: Scenario[] = []

  for (const form of forms) {
    const requiredErrors = form.fields
      .filter((f) => f.required && f.errorTestid)
      .map((f) => f.errorTestid as string)

    if (requiredErrors.length > 0) {
      scenarios.push({
        id: 'form-empty-submit',
        provenance: 'user-input',
        description: 'submit empty form → required field errors appear',
        setup: `click ${form.submitTestid} without filling fields`,
        expectVisible: requiredErrors,
        expectAbsent: [],
        vrtCheckpoint: true
      })
    }

    for (const field of form.fields) {
      if (!field.errorTestid) continue
      scenarios.push({
        id: `field-${field.name}-invalid`,
        provenance: 'user-input',
        description: `${field.name} invalid → error message shows`,
        setup: `fill ${field.testid} with an invalid value, blur`,
        expectVisible: [field.errorTestid],
        expectAbsent: [],
        vrtCheckpoint: false
      })
      scenarios.push({
        id: `field-${field.name}-valid`,
        provenance: 'user-input',
        description: `${field.name} valid → error message hidden`,
        setup: `fill ${field.testid} with a valid value, blur`,
        expectVisible: [],
        expectAbsent: [field.errorTestid],
        vrtCheckpoint: false
      })
    }

    if (form.submitTestid) {
      scenarios.push(form.submitGatedBy
        ? {
            id: 'form-valid-submit',
            provenance: 'user-input',
            description: `all fields valid → submit becomes enabled (gated by ${form.submitGatedBy})`,
            setup: `fill all fields with valid values, then assert ${form.submitTestid} is enabled (do not click)`,
            expectVisible: [form.submitTestid],
            expectAbsent: [],
            vrtCheckpoint: true
          }
        : {
            id: 'form-valid-submit',
            provenance: 'user-input',
            description: 'all fields valid → submitting proceeds to the next state',
            setup: `fill all fields with valid values and click ${form.submitTestid}; assert the resulting page/URL, NOT the submit button (the form navigates away)`,
            expectVisible: [],
            expectAbsent: [],
            vrtCheckpoint: true
          })
    }
  }

  return scenarios
}

export function synthesizeScenarios (
  states: StateNode[],
  forms: FormState[],
  actuatorsByState: Map<string, string[]>
): Scenario[] {
  return [...stateScenarios(states, actuatorsByState), ...formScenarios(forms)]
}
