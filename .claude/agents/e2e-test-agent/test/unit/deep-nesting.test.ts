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
    resolve(ROOT, 'packages/vue-app/src/views/DashboardView.vue'),
    '/#/dashboard',
    aliases
  )
}

function mainContract(m: ReturnType<typeof machine>) {
  return (m.componentContracts ?? []).find((c) => c.component === 'MainContainer')
}

describe('deep nesting + foreign packages', () => {
  it('recurses through all 6 levels of local nesting', () => {
    const c = mainContract(machine())
    const triggers = c!.states.map((s) => s.triggeredBy)
    // depth 3: WidgetLevel store branches
    expect(triggers).toContain('store.loading')
    expect(triggers).toContain('store.isEmpty')
  })

  it('crosses workspace package boundaries (@core store, @ds components)', () => {
    const c = mainContract(machine())
    const names = c!.states.map((s) => s.name)
    // @ds/DsPanel internal state (depth 4) and @ds/DsCard (depth 2)
    expect(names).toContain('when error')   // DsPanel v-if error
    expect(names).toContain('when loading') // DsCard v-if loading
  })

  it('marks foreign npm components as opaque, never invents their states', () => {
    const c = mainContract(machine())
    const opaque = c!.states.filter((s) => s.name.startsWith('opaque:'))
    const opaqueComponents = opaque.map((s) => s.name.replace('opaque:', ''))
    expect(opaqueComponents).toContain('VDataTable')
    expect(opaqueComponents).toContain('Datepicker')
    expect(opaqueComponents).toContain('GoogleMap')
    expect(opaqueComponents).toContain('BarChart')
  })

  it('sets hasOpaque so the runtime probe knows to observe foreign subtrees', () => {
    const c = mainContract(machine())
    expect(c!.hasOpaque).toBe(true)
  })

  it('every opaque state points to a probe, not a guessed assertion', () => {
    const c = mainContract(machine())
    const opaque = c!.states.filter((s) => s.name.startsWith('opaque:'))
    for (const s of opaque) {
      expect(s.assertion).toContain('probe')
      expect(s.assertion).toContain('not statically derivable')
    }
  })

  it('terminates on deep trees (depth bound + cycle guard) without hanging', () => {
    // if this returns at all, recursion is bounded
    const c = mainContract(machine())
    expect(c).toBeDefined()
    expect(c!.states.length).toBeGreaterThan(5)
  })
})
