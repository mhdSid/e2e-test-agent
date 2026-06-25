<template>
  <div data-testid="widget-level">
    <div v-if="store.loading" data-testid="table-loading">Loading rows…</div>
    <div v-else-if="store.isEmpty" data-testid="table-empty">No rows</div>
    <VDataTable
      v-else
      data-testid="data-table"
      :items="store.filtered"
      :headers="headers"
      :loading="store.loading"
    />
    <PanelLevel data-testid="panel-slot" />
  </div>
</template>
<script lang="ts" setup>
import { VDataTable } from 'vuetify/components'
import PanelLevel from './PanelLevel.vue'
import { useDashboardStore } from '@core/dashboard-store'
const store = useDashboardStore()
const headers = [{ title: 'Name', key: 'name' }, { title: 'Revenue', key: 'revenue' }]
</script>
