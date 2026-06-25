<template>
  <div data-testid="confirm-root">
    <template v-if="store.booking">
      <h1 data-testid="confirm-title">Booking Confirmed</h1>
      <p data-testid="confirm-name">Name: {{ store.booking.name }}</p>
      <p data-testid="confirm-email">Email: {{ store.booking.email }}</p>
      <p data-testid="confirm-plan">Plan: {{ store.booking.plan.name }}</p>
      <p data-testid="confirm-price">Total: {{ formatPrice(store.booking.plan.price) }}</p>
      <RouterLink data-testid="back-home" to="/">Back to home</RouterLink>
    </template>
    <template v-else>
      <p data-testid="no-booking">No active booking</p>
      <RouterLink data-testid="back-plans" to="/plans">Browse plans</RouterLink>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { useBookingStore } from '../stores/booking'
import { formatPrice } from '../plans'

const store = useBookingStore()
</script>
