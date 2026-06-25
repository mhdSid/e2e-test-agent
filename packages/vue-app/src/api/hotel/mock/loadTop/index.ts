import { useHotelStore } from '../../../../stores/hotel'
import type { HotelTopApi } from '../../prod/loadTop/types'

// Local/dev implementation — no network. Patches the store with an inline fixture so the
// page renders in the Vite SPA demo. The seed scanner ignores mock variants (prod only).
export async function loadTop (args: HotelTopApi.Request): Promise<void> {
  void args
  const store = useHotelStore()
  store.loadHotelCollection({
    featuredHotels: [
      { hotelId: 1, name: 'Aoyama Grand', imageUrl: 'https://picsum.photos/seed/aoyama/400/300', pricePerNight: 18500, rating: 4.6, availability: 'available', roomCount: 6 },
      { hotelId: 2, name: 'Shibuya Sky Suites', imageUrl: 'https://picsum.photos/seed/shibuya/400/300', pricePerNight: 24000, rating: 4.8, availability: 'limited', roomCount: 2 },
      { hotelId: 3, name: 'Ueno Garden Inn', imageUrl: 'https://picsum.photos/seed/ueno/400/300', pricePerNight: 9800, rating: 4.1, availability: 'sold_out', roomCount: 0 }
    ],
    promotions: [
      { promoId: 1, title: 'Early bird −15%', url: '/promo/early' },
      { promoId: 2, title: 'Free breakfast', url: '/promo/breakfast' }
    ],
    heroImageUrl: 'https://picsum.photos/seed/hero/1200/400'
  })
}
