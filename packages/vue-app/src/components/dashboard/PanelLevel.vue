<template>
  <DsPanel data-testid="panel-level" title="Region Detail" :error="store.error">
    <Datepicker v-model="store.dateFrom" data-testid="date-from" />
    <InnerView data-testid="inner-slot" />
  </DsPanel>
</template>
<script lang="ts" setup>
import Datepicker from '@vuepic/vue-datepicker'
import { DsPanel } from '@ds/DsPanel.vue'
import InnerView from './InnerView.vue'
import { useDashboardStore } from '@core/dashboard-store'
const store = useDashboardStore()
</script>
