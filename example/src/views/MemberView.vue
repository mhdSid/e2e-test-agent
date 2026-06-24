<template>
  <div data-testid="member-root">
    <h1 data-testid="member-title">Membership</h1>

    <!-- THE CRITICAL GUARD: depends on showPremiumPanel (local computed)
         → store.isPremium (store getter)
         → store.tier (store getter)
         → store.memberId (store ref, seeded from route.params.id)
         A keyword classifier sees "isPremium" and guesses data/user.
         The graph slice should trace it all the way to ROUTE. -->
    <section v-if="showPremiumPanel" data-testid="premium-panel">
      <p data-testid="premium-tier">{{ store.tier }}</p>
    </section>
    <section v-else data-testid="standard-panel">
      <p data-testid="standard-msg">Upgrade for premium</p>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useMembershipStore } from '../stores/membership'

const route = useRoute()
const store = useMembershipStore()

// route param seeds the store
watchEffect(() => {
  store.setFromRoute(Number(route.params.id))
})

// local computed reads the store getter — the chain the slice must follow
const showPremiumPanel = computed(() => store.isPremium)
</script>
