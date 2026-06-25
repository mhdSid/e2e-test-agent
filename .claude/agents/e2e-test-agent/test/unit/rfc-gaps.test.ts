import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { generateStateMachine } from '../../src/orchestrators/state-machine/index'

/**
 * Reproductions for the Nuxt/legacy-Vue gaps in rfc-draft.md, all DERIVED structurally
 * (no keyword matching). Fixtures live in fixtures/gaps/*.
 *
 *  A, B  → GAP-1 (thin-shell delegation), GAP-2 (Options API).
 *  C,D,E → GAP-3 (store-proxy taint), GAP-6A (route composable), GAP-4 (loading gate).
 *  All implemented and asserted structurally — no keyword matching.
 */

const F = (p: string): string => resolve(__dirname, 'fixtures/gaps', p)

describe('GAP-1 — thin-shell page delegates to its sole substantive child', () => {
  const m = generateStateMachine(F('a-shell/Shell.vue'), '/#/shell', {})

  it('surfaces the child SFC states when the page is a one-child wrapper', () => {
    const bar = m.states.find((s) => s.condition === 'bar')
    expect(bar).toBeDefined()
    expect(bar!.id).toBe('IF_bar')
    expect(bar!.visibleTestids).toContain('x')
  })
})

describe('GAP-2 — Options API signals (data / computed / methods)', () => {
  const m = generateStateMachine(F('b-options/Baz.vue'), '/#/baz', {})
  const byName = (n: string): { kind: string } | undefined => m.signals.find((s) => s.name === n)

  it('extracts data() bindings as refs', () => {
    expect(byName('list')?.kind).toBe('ref')
  })

  it('extracts computed members as computed signals', () => {
    expect(byName('foo')?.kind).toBe('computed')
  })

  it('wires methods mutations into a transition (actuator → signal → state)', () => {
    const t = m.transitions.find((tr) => tr.actuatorTestid === 'add')
    expect(t).toBeDefined()
    expect(t!.signal).toBe('list')
  })
})

describe('GAP-3 — store-proxy composable taints provenance to store', () => {
  it('hasBar (computed over a store-proxy binding) is store-provenance', () => {
    const m = generateStateMachine(F('c-store-proxy/Qux.vue'), '/#/qux', {})
    const hasBar = m.states.find((s) => s.condition === 'hasBar')
    expect(hasBar?.provenance).toBe('store')
  })
})

describe('GAP-6A — route-reading composable classifies as route', () => {
  it('isStep1 (from a useRoute-backed composable) is route-provenance', () => {
    const m = generateStateMachine(F('d-steps/Wizard.vue'), '/#/wizard', {})
    const s1 = m.states.find((s) => s.condition === 'isStep1')
    expect(s1?.provenance).toBe('route')
  })

  it('does NOT taint a useRouter-only composable to route (word-boundary, not substring)', () => {
    const m = generateStateMachine(F('d-steps/Nav.vue'), '/#/nav', {})
    const open = m.states.find((s) => s.condition === 'open')
    // useNav uses useRouter (navigation), not useRoute — must stay user-input, not route
    expect(open?.provenance).not.toBe('route')
    expect(open?.provenance).toBe('user-input')
  })
})

describe('GAP-4 — loading gate (false→await→true ref) is its own kind', () => {
  it('canRender is classified as a loading-gate, not a plain ref', () => {
    const m = generateStateMachine(F('e-loading-gate/Gate.vue'), '/#/gate', {})
    const canRender = m.signals.find((s) => s.name === 'canRender')
    expect(canRender?.kind as string).toBe('loading-gate')
  })

  it('a loading-gate guard resolves to data provenance (wait-for-content, not click)', () => {
    const m = generateStateMachine(F('e-loading-gate/Gate.vue'), '/#/gate', {})
    const gate = m.states.find((s) => s.condition === 'canRender')
    expect(gate?.provenance).toBe('data')
  })
})
