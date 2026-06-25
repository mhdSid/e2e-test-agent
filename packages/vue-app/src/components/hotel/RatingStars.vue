<template>
  <div class="stars" v-testable="'rating-stars'" :aria-label="`${rating} out of 5`">
    <span v-for="n in 5" :key="n" class="star" :class="{ 'star--on': n <= Math.round(rating) }">★</span>
    <span class="stars__num">{{ rating.toFixed(1) }}</span>
  </div>
</template>

<script lang="ts" setup>
defineProps<{ rating: number }>()
</script>

<style scoped>
.stars { display: inline-flex; align-items: center; gap: .1rem; }
.star { color: #d4d8e0; font-size: .95rem; }
.star--on { color: #f59e0b; }
.stars__num { margin-left: .35rem; font-size: .75rem; color: #64748b; }
</style>
