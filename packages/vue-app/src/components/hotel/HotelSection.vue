<template>
  <section class="section" :class="{ 'section--compact': compact }" v-testable="'hotel-section'">
    <header class="section__head">
      <h2 class="section__title" v-testable="'section-title'">Featured stays</h2>
      <span class="section__count" v-testable="'section-count'">{{ hotels.length }} hotels</span>
    </header>
    <HotelGrid :hotels="hotels" @book="$emit('book', $event)" />
  </section>
</template>

<script lang="ts" setup>
import type { Hotel } from '../../stores/hotel'
import HotelGrid from './HotelGrid.vue'

defineProps<{ hotels: Hotel[]; compact?: boolean }>()
defineEmits<{ book: [hotelId: number] }>()
</script>

<style scoped>
.section { margin: 1.25rem 0; }
.section__head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: .9rem; }
.section__title { margin: 0; font-size: 1.35rem; color: #0f172a; letter-spacing: -.01em; }
.section__count { font-size: .8rem; color: #64748b; }
.section--compact .section__title { font-size: 1.1rem; }
</style>
