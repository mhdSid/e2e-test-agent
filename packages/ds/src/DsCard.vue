<template>
  <div data-testid="ds-card">
    <div v-if="loading" data-testid="ds-card-loading">Loading…</div>
    <div v-else data-testid="ds-card-body"><slot /></div>
  </div>
</template>
<script lang="ts" setup>
defineProps<{ loading?: boolean }>()
</script>
