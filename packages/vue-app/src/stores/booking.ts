import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Plan } from '../plans'

interface Booking {
  plan: Plan
  name: string
  email: string
}

export const useBookingStore = defineStore('booking', () => {
  const booking = ref<Booking | null>(null)

  function confirm(data: Booking): void {
    booking.value = data
  }

  function reset(): void {
    booking.value = null
  }

  return { booking, confirm, reset }
})
