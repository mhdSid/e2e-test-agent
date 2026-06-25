<template>
  <div data-testid="checkout-root">
    <GBreadcrumb data-testid="breadcrumb" :items="crumbs" />
    <h1 data-testid="checkout-title">Checkout</h1>

    <!-- empty cart state -->
    <div v-if="store.isEmpty" data-testid="empty-cart">
      <p data-testid="empty-msg">Your cart is empty</p>
      <RouterLink data-testid="empty-browse" to="/plans">Browse plans</RouterLink>
    </div>

    <!-- processing state (validating OR submitting) -->
    <div v-else-if="store.isProcessing" data-testid="processing">
      <GSpinner data-testid="spinner" />
      <p data-testid="processing-msg">Processing your order...</p>
    </div>

    <!-- confirmed state -->
    <div v-else-if="store.status === 'confirmed'" data-testid="confirmed">
      <GAlert data-testid="confirmed-alert" variant="success">Order confirmed</GAlert>
      <p data-testid="confirmed-total">Paid: {{ store.total }}</p>
      <RouterLink data-testid="confirmed-home" to="/">Home</RouterLink>
    </div>

    <!-- failed state -->
    <div v-else-if="store.status === 'failed'" data-testid="failed">
      <GAlert data-testid="failed-alert" variant="error">{{ store.errorMessage }}</GAlert>
      <GButton data-testid="retry-btn" @click="onRetry">Retry</GButton>
    </div>

    <!-- main checkout form (idle, non-empty) -->
    <form v-else data-testid="checkout-form" @submit.prevent="onSubmit">
      <ul data-testid="line-list">
        <li v-for="line in store.lines" :key="line.id" data-testid="line-item">
          <span data-testid="line-name">{{ line.name }}</span>
          <span data-testid="line-qty">{{ line.qty }}</span>
        </li>
      </ul>

      <p data-testid="subtotal">Subtotal: {{ store.subtotal }}</p>
      <p v-if="store.discountRate > 0" data-testid="discount">
        Discount: {{ Math.round(store.discountRate * 100) }}%
      </p>
      <p data-testid="grand-total">Total: {{ store.total }}</p>

      <GFormField label="Name">
        <GInput v-model="form.name" data-testid="field-name" name="name" required />
        <span v-if="errors.name" data-testid="error-name">{{ errors.name }}</span>
      </GFormField>

      <GFormField label="Email">
        <GInput v-model="form.email" data-testid="field-email" name="email" type="email" required />
        <span v-if="errors.email" data-testid="error-email">{{ errors.email }}</span>
      </GFormField>

      <GFormField label="Phone">
        <GInput v-model="form.phone" data-testid="field-phone" name="phone" required />
        <span v-if="errors.phone" data-testid="error-phone">{{ errors.phone }}</span>
      </GFormField>

      <GFormField label="Players">
        <GSelect v-model="form.players" data-testid="field-players" name="players" required />
        <span v-if="errors.players" data-testid="error-players">{{ errors.players }}</span>
      </GFormField>

      <div data-testid="coupon-row">
        <GInput v-model="couponInput" data-testid="field-coupon" name="coupon" />
        <GButton data-testid="apply-coupon" @click="onApplyCoupon">Apply</GButton>
        <span v-if="store.couponApplied" data-testid="coupon-ok">Coupon applied</span>
      </div>

      <GButton
        data-testid="submit-btn"
        type="submit"
        :disabled="!store.canSubmit || !meta.valid"
      >Place Order</GButton>

      <GAlert v-if="meta.touched && !meta.valid" data-testid="form-warning" variant="warning">
        Please complete all fields
      </GAlert>
    </form>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref, computed } from 'vue'
import { useForm } from 'vee-validate'
import {
  GBreadcrumb, GSpinner, GAlert, GButton, GFormField, GInput, GSelect
} from '@gora/design-system'
import { useCheckoutStore } from '../stores/checkout'
import { checkoutSchema } from '../schemas/checkout'

const store = useCheckoutStore()
const { errors, meta, handleSubmit } = useForm({ validationSchema: checkoutSchema })

const form = reactive({ name: '', email: '', phone: '', players: 1 })
const couponInput = ref('')

const crumbs = computed(() => [
  { label: 'Home', to: '/' },
  { label: 'Checkout', to: '/checkout' }
])

function onApplyCoupon(): void {
  store.applyCoupon(couponInput.value)
}

const onSubmit = handleSubmit(() => {
  store.submit()
})

function onRetry(): void {
  store.reset()
}
</script>
