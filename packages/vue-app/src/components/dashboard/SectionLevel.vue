<template>
  <DsCard data-testid="section-level" :loading="store.loading">
    <h2 data-testid="section-title">Revenue by Region</h2>
    <WidgetLevel data-testid="widget-slot" />
  </DsCard>
</template>
<script lang="ts" setup>
import { DsCard } from '@ds/DsCard.vue'
import WidgetLevel from './WidgetLevel.vue'
import { useDashboardStore } from '@core/dashboard-store'
const store = useDashboardStore()
</script>
