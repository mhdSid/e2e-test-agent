<template>
  <div data-testid="main-container">
    <div v-if="store.hasError" data-testid="main-error">{{ store.error }}</div>
    <template v-else>
      <div data-testid="main-toolbar">
        <select v-model="store.selectedRegion" data-testid="region-select">
          <option value="">All</option>
          <option value="east">East</option>
        </select>
        <span data-testid="total-revenue">{{ store.totalRevenue }}</span>
      </div>
      <SectionLevel data-testid="section-slot" />
    </template>
  </div>
</template>
<script lang="ts" setup>
import SectionLevel from './SectionLevel.vue'
import { useDashboardStore } from '@core/dashboard-store'
const store = useDashboardStore()
</script>
