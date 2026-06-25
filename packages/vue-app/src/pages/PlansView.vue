<template>
  <div data-testid="plans-root">
    <h1 data-testid="plans-title">Available Plans</h1>
    <ul data-testid="plan-list">
      <li
        v-for="plan in PLANS"
        :key="plan.id"
        data-testid="plan-item"
        :data-plan-id="plan.id"
      >
        <span data-testid="plan-name">{{ plan.name }}</span>
        <span data-testid="plan-price">{{ formatPrice(plan.price) }}</span>
        <span
          v-if="plan.seats === 0"
          data-testid="plan-status"
        >Sold out</span>
        <span
          v-else
          data-testid="plan-status"
        >{{ plan.seats }} seats</span>
        <span
          v-if="plan.featured"
          data-testid="plan-badge"
        >Featured</span>
        <RouterLink
          v-if="plan.seats > 0"
          :to="`/book/${plan.id}`"
          data-testid="plan-book"
        >Book</RouterLink>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { PLANS, formatPrice } from '../plans'
</script>
