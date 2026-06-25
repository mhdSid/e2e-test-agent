<template>
  <div data-testid="book-root">
    <template v-if="plan && plan.seats > 0">
      <h1 data-testid="book-title">Book: {{ plan.name }}</h1>
      <p data-testid="book-price">{{ formatPrice(plan.price) }}</p>
      <form data-testid="book-form" @submit.prevent="submit">
        <input
          v-model="form.name"
          data-testid="input-name"
          name="name"
          placeholder="Your name"
          required
        />
        <input
          v-model="form.email"
          data-testid="input-email"
          name="email"
          type="email"
          placeholder="Email"
          required
        />
        <button data-testid="submit-btn" type="submit">Confirm Booking</button>
      </form>
    </template>
    <template v-else>
      <p data-testid="error-msg">Plan unavailable</p>
      <RouterLink data-testid="back-link" to="/plans">Back to plans</RouterLink>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PLANS, formatPrice } from '../plans'
import { useBookingStore } from '../stores/booking'

const route  = useRoute()
const router = useRouter()
const store  = useBookingStore()

const plan = computed(() =>
  PLANS.find((p) => p.id === Number(route.params.id)) ?? null
)

const form = reactive({ name: '', email: '' })

function submit(): void {
  if (!plan.value) return
  store.confirm({ plan: plan.value, name: form.name, email: form.email })
  router.push('/confirm')
}
</script>
