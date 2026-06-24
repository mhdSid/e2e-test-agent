import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useMembershipStore = defineStore('membership', () => {
  // set from the route param elsewhere; tier is DERIVED from it
  const memberId = ref<number>(0)

  // getter chain: tier depends on memberId (which is route-seeded)
  const tier = computed(() => {
    if (memberId.value >= 100) return 'platinum'
    if (memberId.value >= 10) return 'gold'
    return 'standard'
  })

  const isPremium = computed(() => tier.value !== 'standard')

  function setFromRoute(id: number): void {
    memberId.value = id
  }

  return { memberId, tier, isPremium, setFromRoute }
})
