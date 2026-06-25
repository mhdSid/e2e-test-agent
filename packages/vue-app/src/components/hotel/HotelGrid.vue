<template>
  <div class="grid-wrap" v-testable="'hotel-grid'">
    <!-- child-owned empty state (inline, not via a layout component) -->
    <div v-if="hotels.length" class="grid">
      <HotelCard v-for="h in hotels" :key="h.hotelId" :hotel="h" @book="$emit('book', $event)" />
    </div>
    <p v-else class="grid__empty" v-testable="'grid-empty'">No hotels match your filters.</p>
  </div>
</template>

<script lang="ts" setup>
import type { Hotel } from '../../stores/hotel'
import HotelCard from './HotelCard.vue'

defineProps<{ hotels: Hotel[] }>()
defineEmits<{ book: [hotelId: number] }>()
</script>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.1rem; }
.grid__empty { padding: 2rem; text-align: center; color: #94a3b8; background: #f8fafc; border-radius: 12px; }
</style>
