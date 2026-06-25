import { defineStore } from 'pinia'
import type { Hotel, Promo, HotelCollection } from './types'

export type { Hotel, Promo, HotelCollection } from './types'

/**
 * Hotel store — options style (state/getters/actions). Getters trace to backing state
 * fields (store-schema extraction); the action is what the api loader calls to patch state.
 */
export const useHotelStore = defineStore('hotel', {
  state: () => ({
    featuredHotels: [] as Hotel[],
    promotions: [] as Promo[],
    heroImageUrl: '' as string | null
  }),
  getters: {
    hasFeatured: (state) => state.featuredHotels.length > 0,
    hasPromotions: (state) => state.promotions.length > 0
  },
  actions: {
    loadHotelCollection (data: HotelCollection): void {
      this.featuredHotels = data.featuredHotels
      this.promotions = data.promotions
      this.heroImageUrl = data.heroImageUrl
    }
  }
})
