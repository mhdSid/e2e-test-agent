import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { generateStateMachine } from '../../src/orchestrators/state-machine/index'

const ROOT = resolve(__dirname, '../../../../..')
const aliases = {
  '@/': resolve(ROOT, 'packages/vue-app/src'),
  '@core/': resolve(ROOT, 'packages/core/src'),
  '@ds/': resolve(ROOT, 'packages/ds/src')
}

function machine() {
  return generateStateMachine(
    resolve(ROOT, 'packages/vue-app/src/pages/DashboardView.vue'),
    '/#/dashboard',
    aliases
  )
}

// DashboardView is a thin shell (<MainContainer/> only), so GAP-1 delegation analyses
// MainContainer instead — its v-if branches become top-level states and its deep subtree
// (SectionLevel → … → DsCard/DsPanel/foreign widgets) lands in child contracts. The
// recursive-derivation + opaque-boundary capability is unchanged; only the entry point is
// one level down. We assert across ALL contract states so the test is delegation-robust.
function allContractStates(m: ReturnType<typeof machine>) {
  return (m.componentContracts ?? []).flatMap((c) => c.states)
}

describe('deep nesting + foreign packages', () => {
  it('delegates the thin-shell page to its substantive child (GAP-1)', () => {
    expect(machine().file.endsWith('MainContainer.vue')).toBe(true)
  })

  it('recurses through all levels of local nesting', () => {
    const triggers = allContractStates(machine()).map((s) => s.triggeredBy)
    // WidgetLevel store branches, deep in the subtree
    expect(triggers).toContain('store.loading')
    expect(triggers).toContain('store.isEmpty')
  })

  it('crosses workspace package boundaries (@core store, @ds components)', () => {
    const names = allContractStates(machine()).map((s) => s.name)
    // @ds/DsPanel internal state and @ds/DsCard
    expect(names).toContain('when error')   // DsPanel v-if error
    expect(names).toContain('when loading') // DsCard v-if loading
  })

  it('marks foreign npm components as opaque, never invents their states', () => {
    const opaque = allContractStates(machine()).filter((s) => s.name.startsWith('opaque:'))
    const opaqueComponents = opaque.map((s) => s.name.replace('opaque:', ''))
    expect(opaqueComponents).toContain('VDataTable')
    expect(opaqueComponents).toContain('Datepicker')
    expect(opaqueComponents).toContain('GoogleMap')
    expect(opaqueComponents).toContain('BarChart')
  })

  it('sets hasOpaque so the runtime probe knows to observe foreign subtrees', () => {
    expect((machine().componentContracts ?? []).some((c) => c.hasOpaque)).toBe(true)
  })

  it('every opaque state points to a probe, not a guessed assertion', () => {
    const opaque = allContractStates(machine()).filter((s) => s.name.startsWith('opaque:'))
    for (const s of opaque) {
      expect(s.assertion).toContain('probe')
      expect(s.assertion).toContain('not statically derivable')
    }
  })

  it('terminates on deep trees (depth bound + cycle guard) without hanging', () => {
    // if this returns at all, recursion is bounded
    const states = allContractStates(machine())
    expect(states.length).toBeGreaterThan(5)
  })
})
