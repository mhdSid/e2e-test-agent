<template>
  <div class="hotel-page" v-testable="'hotel-main'">
    <img v-if="store.heroImageUrl" :src="store.heroImageUrl" class="hero" alt="" v-testable="'hotel-hero'">

    <!-- layout component owns loading/empty/content; content projected into it -->
    <StateLayout :loading="!canRender" :empty="canRender && !hasFeatured">
      <template #loading>
        <div class="page-skeleton" v-testable="'page-skeleton'">Loading stays…</div>
      </template>
      <template #empty>
        <div v-testable="'page-empty'">No featured hotels right now.</div>
      </template>
      <HotelSection :hotels="store.featuredHotels" :compact="isMobile" @book="onBook" />
    </StateLayout>

    <PromoRail v-if="hasPromotions" :promos="store.promotions" />

    <p v-if="lastBooked" class="toast" v-testable="'book-toast'">Booked hotel #{{ lastBooked }}</p>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useHotelStore } from '../../stores/hotel'
import StateLayout from './StateLayout.vue'
import HotelSection from './HotelSection.vue'
import PromoRail from './PromoRail.vue'

const store = useHotelStore()
// dominant Pinia pattern — getters via storeToRefs (provenance must taint to store)
const { hasFeatured, hasPromotions } = storeToRefs(store)

// loading gate: async false -> await -> true (data-driven, not user input)
const canRender = ref(false)
async function hydrate (): Promise<void> {
  canRender.value = false
  await Promise.resolve()
  canRender.value = true
}
onMounted(hydrate)

const isMobile = computed(() => window.innerWidth <= 768)
const lastBooked = ref<number | null>(null)
const onBook = (hotelId: number): void => { lastBooked.value = hotelId }
</script>

<style scoped>
.hotel-page { max-width: 1040px; margin: 0 auto; padding: 1rem 1.25rem 3rem; font-family: system-ui, sans-serif; }
.hero {
  width: 100%; height: 220px; object-fit: cover; border-radius: 18px; margin-bottom: 1.25rem;
  box-shadow: 0 8px 30px rgba(15, 23, 42, .15);
}
.page-skeleton { padding: 2rem; color: #94a3b8; }
.toast {
  position: sticky; bottom: 1rem; margin-top: 1.5rem; padding: .7rem 1.1rem; border-radius: 12px;
  background: #0f172a; color: #fff; font-size: .85rem; font-weight: 600; width: fit-content;
}
</style>
