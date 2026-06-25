<template>
  <div data-testid="search-root">
    <h1 data-testid="search-title">Search Plans</h1>
    <form data-testid="search-form" @submit.prevent>
      <input
        v-model="query"
        data-testid="search-input"
        placeholder="Search by name..."
      />
      <button data-testid="search-btn" type="submit">Search</button>
    </form>
    <template v-if="query">
      <p data-testid="result-count">{{ results.length }} result(s)</p>
      <ul data-testid="result-list">
        <li
          v-for="plan in results"
          :key="plan.id"
          data-testid="result-item"
        >
          <span data-testid="result-name">{{ plan.name }}</span>
          <span data-testid="result-price">{{ formatPrice(plan.price) }}</span>
        </li>
      </ul>
      <p
        v-if="results.length === 0"
        data-testid="no-results"
      >No plans found</p>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { PLANS, formatPrice } from '../plans'

const query = ref('')

const results = computed(() =>
  PLANS.filter((p) =>
    p.name.toLowerCase().includes(query.value.toLowerCase())
  )
)
</script>
