<template>
  <section data-testid="ds-panel">
    <header data-testid="ds-panel-title">{{ title }}</header>
    <div v-if="error" data-testid="ds-panel-error">{{ error }}</div>
    <slot v-else />
  </section>
</template>
<script lang="ts" setup>
defineProps<{ title: string; error?: string | null }>()
</script>
