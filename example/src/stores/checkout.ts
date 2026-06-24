import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface CartLine {
  id: number
  name: string
  unitPrice: number
  qty: number
}

export type CheckoutStatus = 'idle' | 'validating' | 'submitting' | 'confirmed' | 'failed'

export const useCheckoutStore = defineStore('checkout', () => {
  // ── state (refs) ──
  const lines = ref<CartLine[]>([])
  const status = ref<CheckoutStatus>('idle')
  const couponCode = ref<string>('')
  const couponApplied = ref<boolean>(false)
  const memberTier = ref<'guest' | 'silver' | 'gold'>('guest')
  const errorMessage = ref<string | null>(null)

  // ── getters (computed) — chained, this is what the state machine must trace ──
  const itemCount = computed(() => lines.value.reduce((n, l) => n + l.qty, 0))

  const subtotal = computed(() =>
    lines.value.reduce((sum, l) => sum + l.unitPrice * l.qty, 0)
  )

  const discountRate = computed(() => {
    if (memberTier.value === 'gold') return 0.2
    if (memberTier.value === 'silver') return 0.1
    return couponApplied.value ? 0.05 : 0
  })

  const total = computed(() =>
    Math.round(subtotal.value * (1 - discountRate.value))
  )

  const isEmpty = computed(() => itemCount.value === 0)

  const canSubmit = computed(() =>
    !isEmpty.value && status.value === 'idle' && total.value > 0
  )

  const isProcessing = computed(() =>
    status.value === 'validating' || status.value === 'submitting'
  )

  // ── actions ──
  function addLine(line: CartLine): void {
    lines.value.push(line)
  }

  function applyCoupon(code: string): void {
    couponCode.value = code
    couponApplied.value = code.length > 0
  }

  function setTier(tier: 'guest' | 'silver' | 'gold'): void {
    memberTier.value = tier
  }

  async function submit(): Promise<void> {
    if (!canSubmit.value) return
    status.value = 'submitting'
    errorMessage.value = null
    try {
      await Promise.resolve()
      status.value = 'confirmed'
    } catch {
      status.value = 'failed'
      errorMessage.value = 'Submission failed'
    }
  }

  function reset(): void {
    lines.value = []
    status.value = 'idle'
    couponApplied.value = false
    errorMessage.value = null
  }

  return {
    lines, status, couponCode, couponApplied, memberTier, errorMessage,
    itemCount, subtotal, discountRate, total, isEmpty, canSubmit, isProcessing,
    addLine, applyCoupon, setTier, submit, reset
  }
})
