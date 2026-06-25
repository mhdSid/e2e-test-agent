<template>
  <div class="booking" v-testable="'booking-controls'">
    <GuestSelector :max-rooms="hotel.roomCount" @change="onGuests" />
    <button class="booking__cta" :disabled="!canBook" @click="$emit('book', hotel.hotelId)" v-testable="'book-btn'">
      Book — ¥{{ hotel.pricePerNight.toLocaleString() }}
    </button>
    <p v-if="!canBook" class="booking__warn" v-testable="'booking-warn'">Party exceeds room capacity</p>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import type { Hotel } from '../../stores/hotel'
import GuestSelector from './GuestSelector.vue'

const props = defineProps<{ hotel: Hotel }>()
defineEmits<{ book: [hotelId: number] }>()

const guests = ref(2)
const onGuests = (total: number): void => { guests.value = total }
const canBook = computed(() => guests.value <= props.hotel.roomCount * 2)
</script>

<style scoped>
.booking { display: flex; flex-direction: column; gap: .6rem; margin-top: .75rem; }
.booking__cta {
  border: none; border-radius: 10px; padding: .6rem 1rem; font-weight: 700; color: #fff; cursor: pointer;
  background: linear-gradient(135deg, #2563eb, #4f46e5); box-shadow: 0 4px 14px rgba(37, 99, 235, .35);
  transition: transform .12s ease, box-shadow .12s ease;
}
.booking__cta:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37, 99, 235, .45); }
.booking__cta:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }
.booking__warn { margin: 0; font-size: .75rem; color: #dc2626; }
</style>
