import { get } from '../../../client'
import { useHotelStore } from '../../../../stores/hotel'
import type { HotelTopApi } from './types'

// Guarded so the module is browser-safe (process is undefined in the SPA) while keeping the
// `process.env.API_ORIGIN` access the seed scanner reads as the target.
const API_ORIGIN = (typeof process !== 'undefined' && process.env.API_ORIGIN) || ''

// snake_case API shape → camelCase store shape. The seed body is HotelTopApi.Response (NOT
// this transform's output); the generator instantiates the Response, fed through here.
function processResponse (top: HotelTopApi.Top): {
  featuredHotels: Array<{ hotelId: number; name: string; imageUrl: string; pricePerNight: number; rating: number; availability: HotelTopApi.Hotel['availability']; roomCount: number }>
  promotions: Array<{ promoId: number; title: string; url: string }>
  heroImageUrl: string | null
} {
  return {
    featuredHotels: top.featured_hotels.map((h) => ({
      hotelId: h.hotel_id,
      name: h.name,
      imageUrl: h.image_url,
      pricePerNight: h.price_per_night,
      rating: h.rating,
      availability: h.availability,
      roomCount: h.room_count
    })),
    promotions: top.promotions.map((p) => ({ promoId: p.promo_id, title: p.title, url: p.url })),
    heroImageUrl: top.hero_image_url
  }
}

export async function loadTop (args: HotelTopApi.Request): Promise<void> {
  const store = useHotelStore()

  const path = '/hotel/v1/top'
  const override = (typeof process !== 'undefined' && process.env[path]) || ''
  const apiUrl = override || `${API_ORIGIN}${path}`
  const cancelProxy = !!override

  const request: HotelTopApi.Request = { city_id: args.city_id }
  const response: HotelTopApi.Response = await get(apiUrl, request as unknown as Record<string, unknown>, !cancelProxy && {
    auth: true,
    disableVerifyUser: true
  })

  const top = response?.data?.[0]?.top
  if (top) store.loadHotelCollection(processResponse(top))
}
