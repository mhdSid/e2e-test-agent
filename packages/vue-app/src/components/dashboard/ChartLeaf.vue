<template>
  <div data-testid="chart-leaf">
    <div v-if="store.isEmpty" data-testid="chart-empty">No data to chart</div>
    <BarChart v-else data-testid="revenue-chart" :data="store.filtered" :options="opts" />
  </div>
</template>
<script lang="ts" setup>
import { computed } from 'vue'
import { BarChart } from 'vue-chart-3'
import { useDashboardStore } from '@core/dashboard-store'
const store = useDashboardStore()
const opts = computed(() => ({ responsive: true }))
</script>
