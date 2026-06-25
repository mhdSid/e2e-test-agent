<template>
  <div data-testid="inner-view">
    <GoogleMap
      data-testid="region-map"
      api-key="x"
      :center="center"
      :zoom="zoom"
    />
    <ChartLeaf data-testid="chart-leaf-slot" />
  </div>
</template>
<script lang="ts" setup>
import { computed } from 'vue'
import { GoogleMap } from 'vue3-google-map'
import ChartLeaf from './ChartLeaf.vue'
import { useDashboardStore } from '@core/dashboard-store'
const store = useDashboardStore()
const center = computed(() => ({ lat: 35, lng: 139 }))
const zoom = 8
</script>
