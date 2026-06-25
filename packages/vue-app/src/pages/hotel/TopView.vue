<template>
  <MainContainer />
</template>

<script lang="ts" setup>
import { onServerPrefetch, onMounted } from 'vue'
import MainContainer from '../../components/hotel/MainContainer.vue'
import { loadApi } from '../../api'

// Minimal shell page. SSR data fetch enters via onServerPrefetch (the seed scanner follows
// loadApi('hotel') → index.prod → prod/loadTop → the network call + Response type). onMounted
// populates the store in this Vite SPA demo (mock actions) so the page renders.
const load = async (): Promise<void> => {
  const actions = await loadApi('hotel')
  await actions.loadTop({ city_id: 13 })
}

onServerPrefetch(load)
onMounted(load)
</script>
