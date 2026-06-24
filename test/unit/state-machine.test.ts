import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { generateStateMachine } from '../../src/orchestrators/state-machine/index'
import type { StateNode } from '../../src/orchestrators/state-machine/types'

const CHECKOUT = resolve(__dirname, '../../example/src/views/CheckoutView.vue')

function machine() {
  return generateStateMachine(CHECKOUT, '/#/checkout', {})
}

function byCondition(states: StateNode[], cond: string): StateNode | undefined {
  return states.find((s) => s.condition === cond)
}

function elseOf(states: StateNode[], chainId: string): StateNode | undefined {
  return states.find((s) => s.chainId === chainId && s.isElse)
}

describe('state machine — complex checkout component', () => {

  describe('branch chain structure', () => {
    it('groups the 5-way status chain (empty/processing/confirmed/failed/else) into ONE chain', () => {
      const m = machine()
      const emptyState = byCondition(m.states, 'store.isEmpty')
      expect(emptyState).toBeDefined()

      const chainId = emptyState!.chainId
      const chainStates = m.states.filter((s) => s.chainId === chainId)

      // if + 3 else-if + else = 5 mutually exclusive states
      expect(chainStates).toHaveLength(5)
    })

    it('marks else-if branches as part of the chain, not independent v-if blocks', () => {
      const m = machine()
      const processing = byCondition(m.states, 'store.isProcessing')
      const confirmed = byCondition(m.states, "store.status === 'confirmed'")
      const empty = byCondition(m.states, 'store.isEmpty')

      // all three share the same chain — they are mutually exclusive
      expect(processing!.chainId).toBe(empty!.chainId)
      expect(confirmed!.chainId).toBe(empty!.chainId)
    })

    it('keeps independent v-if blocks (discount, coupon, errors) in separate chains', () => {
      const m = machine()
      const discount = byCondition(m.states, 'store.discountRate > 0')
      const coupon = byCondition(m.states, 'store.couponApplied')
      const statusEmpty = byCondition(m.states, 'store.isEmpty')

      // these are NOT alternatives to the status chain
      expect(discount!.chainId).not.toBe(statusEmpty!.chainId)
      expect(coupon!.chainId).not.toBe(statusEmpty!.chainId)
    })
  })

  describe('else recipe — must negate ALL prior chain conditions', () => {
    it('the form (final else) requires every prior branch to be false', () => {
      const m = machine()
      const empty = byCondition(m.states, 'store.isEmpty')
      const formElse = elseOf(m.states, empty!.chainId)
      expect(formElse).toBeDefined()

      // to reach the form: NOT empty AND NOT processing AND status != confirmed AND status != failed
      const accesses = formElse!.recipe.map((r) => r.access)
      expect(accesses).toContain('store.isEmpty')       // currently passes
      expect(accesses).toContain('store.isProcessing')  // currently FAILS — only first negated
      expect(accesses).toContain('store.status')        // currently FAILS
    })
  })

  describe('provenance', () => {
    it('classifies store-getter guards as store', () => {
      const m = machine()
      expect(byCondition(m.states, 'store.isEmpty')!.provenance).toBe('store')
      expect(byCondition(m.states, 'store.isProcessing')!.provenance).toBe('store')
    })

    it('classifies validation-error guards as validation, not user-input', () => {
      const m = machine()
      const errName = byCondition(m.states, 'errors.name')
      // errors.* comes from vee-validate — should be 'validation'
      expect(errName!.provenance).toBe('validation')
    })

    it('else inherits the chain provenance (store), never defaults to data', () => {
      const m = machine()
      const empty = byCondition(m.states, 'store.isEmpty')
      const formElse = elseOf(m.states, empty!.chainId)
      expect(formElse!.provenance).toBe('store')
    })
  })

  describe('recipe extraction', () => {
    it('extracts exact status values from equality guards', () => {
      const m = machine()
      const confirmed = byCondition(m.states, "store.status === 'confirmed'")
      expect(confirmed!.recipe).toContainEqual(
        expect.objectContaining({ access: 'store.status', operator: '===', value: 'confirmed' })
      )
    })

    it('preserves both clauses of a compound guard (meta.touched && !meta.valid)', () => {
      const m = machine()
      const warning = byCondition(m.states, 'meta.touched && !meta.valid')
      const accesses = warning!.recipe.map((r) => r.access)
      // both meta.touched AND meta.valid should appear — compound not truncated
      expect(accesses).toContain('meta.touched')
      expect(accesses).toContain('meta.valid')
    })
  })

  describe('form detection', () => {
    it('detects a validated form structurally (validity gate + error elements), not by library name', () => {
      const m = machine()
      const form = m.forms[0]
      expect(form.validated).toBe(true)
    })

    it('treats only schema-validated inputs as validation fields, not the coupon input', () => {
      const m = machine()
      const form = m.forms[0]
      const fieldNames = form.fields.map((f) => f.name)
      expect(fieldNames).toContain('name')
      expect(fieldNames).toContain('email')
      // coupon has no schema rule and no error testid — not a validation field
      expect(fieldNames).not.toContain('couponInput')
    })

    it('maps each validated field to its error testid', () => {
      const m = machine()
      const form = m.forms[0]
      const email = form.fields.find((f) => f.name === 'email')
      expect(email!.errorTestid).toBe('error-email')
    })
  })

  describe('v-for empty state (implicit)', () => {
    it('recognizes the line-list v-for produces an implicit empty state', () => {
      const m = machine()
      // line-item is rendered via v-for over store.lines
      const hasLineItem = m.states.some((s) => s.visibleTestids.includes('line-item'))
        || m.scenarios.some((sc) => JSON.stringify(sc).includes('line-item'))
      expect(hasLineItem).toBe(true)
    })
  })
})
