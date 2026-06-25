<template>
  <article class="card" v-testable="'hotel-card'">
    <img :src="hotel.imageUrl" :alt="hotel.name" class="card__img" v-testable="'card-image'">
    <div class="card__body">
      <h3 class="card__name" v-testable="'card-name'">{{ hotel.name }}</h3>
      <RatingStars :rating="hotel.rating" />

      <!-- availability status chain: mutually exclusive (v-if / else-if / else) -->
      <span v-if="hotel.availability === 'available'" class="badge badge--ok" v-testable="'badge-available'">Available</span>
      <span v-else-if="hotel.availability === 'limited'" class="badge badge--warn" v-testable="'badge-limited'">Only {{ hotel.roomCount }} left</span>
      <span v-else class="badge badge--out" v-testable="'badge-soldout'">Sold out</span>

      <BookingControls
        v-if="hotel.availability !== 'sold_out'"
        :hotel="hotel"
        @book="$emit('book', $event)"
        v-testable="'card-booking'"
      />
    </div>
  </article>
</template>

<script lang="ts" setup>
import type { Hotel } from '../../stores/hotel'
import RatingStars from './RatingStars.vue'
import BookingControls from './BookingControls.vue'

defineProps<{ hotel: Hotel }>()
defineEmits<{ book: [hotelId: number] }>()
</script>

<style scoped>
.card {
  border: 1px solid #eef1f5; border-radius: 14px; overflow: hidden; background: #fff;
  box-shadow: 0 2px 10px rgba(15, 23, 42, .05); transition: transform .15s ease, box-shadow .15s ease;
}
.card:hover { transform: translateY(-3px); box-shadow: 0 10px 26px rgba(15, 23, 42, .12); }
.card__img { width: 100%; height: 150px; object-fit: cover; background: #e2e8f0; }
.card__body { padding: .9rem 1rem 1.1rem; }
.card__name { margin: 0 0 .35rem; font-size: 1.02rem; color: #0f172a; }
.badge { display: inline-block; margin: .5rem 0; padding: .15rem .6rem; border-radius: 999px; font-size: .72rem; font-weight: 700; }
.badge--ok { background: #dcfce7; color: #15803d; }
.badge--warn { background: #fef3c7; color: #b45309; }
.badge--out { background: #fee2e2; color: #b91c1c; }
</style>
