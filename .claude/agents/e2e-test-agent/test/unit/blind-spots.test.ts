import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { generateStateMachine } from '../../src/orchestrators/state-machine/index'

// from test/unit → up 5 to repo root → packages/vue-app
const VIEW = resolve(__dirname, '../../../../../packages/vue-app/src/views/BlindSpotsView.vue')

function unresolvedKinds (): string[] {
  return generateStateMachine(VIEW, '/#/bs', {}).unresolved.map((u) => u.kind)
}

describe('loud uncertainty — blind spots are declared, never silent', () => {
  it('flags <component :is> as a dynamic-component the probe must resolve', () => {
    expect(unresolvedKinds()).toContain('dynamic-component')
  })

  it('flags <slot> as a projection boundary', () => {
    expect(unresolvedKinds()).toContain('slot-projection')
  })

  it('flags a v-for with per-row conditional/component state as a dynamic-list', () => {
    expect(unresolvedKinds()).toContain('dynamic-list')
  })

  it('flags a guard reading inject()ed state as injected-state (no static edge)', () => {
    expect(unresolvedKinds()).toContain('injected-state')
  })

  it('does NOT over-flag the simple example views (no blind spots there)', () => {
    const plans = resolve(__dirname, '../../../../../packages/vue-app/src/views/PlansView.vue')
    expect(generateStateMachine(plans, '/#/plans', {}).unresolved).toHaveLength(0)
  })
})
