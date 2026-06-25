<template>
  <div class="state-layout" v-testable="'state-layout'">
    <!-- the layout component OWNS the loading/empty/content states (3-way exclusive),
         driven by parent props; the actual content is projected via the default slot -->
    <div v-if="loading" class="sl sl--loading" v-testable="'sl-loading'">
      <slot name="loading"><span class="shimmer" /></slot>
    </div>
    <div v-else-if="empty" class="sl sl--empty" v-testable="'sl-empty'">
      <slot name="empty">Nothing to show yet.</slot>
    </div>
    <div v-else class="sl sl--content" v-testable="'sl-content'">
      <slot />
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{ loading: boolean; empty: boolean }>()
</script>

<style scoped>
.sl--empty { padding: 2.5rem; text-align: center; color: #94a3b8; }
.shimmer {
  display: block; height: 120px; border-radius: 12px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
  background-size: 400% 100%; animation: shimmer 1.3s ease infinite;
}
@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
</style>
