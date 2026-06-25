<template>
  <aside class="promos" v-testable="'promo-rail'">
    <a v-for="p in promos" :key="p.promoId" :href="p.url" class="promo" v-testable="'promo-link'">
      <span class="promo__dot" />{{ p.title }}
    </a>
  </aside>
</template>

<script lang="ts" setup>
import type { Promo } from '../../stores/hotel'

defineProps<{ promos: Promo[] }>()
</script>

<style scoped>
.promos { display: flex; gap: .6rem; flex-wrap: wrap; margin: 1rem 0; }
.promo {
  display: inline-flex; align-items: center; gap: .4rem; padding: .45rem .8rem; border-radius: 999px;
  background: #eef2ff; color: #4338ca; font-size: .82rem; font-weight: 600; text-decoration: none;
  transition: background .15s ease;
}
.promo:hover { background: #e0e7ff; }
.promo__dot { width: .5rem; height: .5rem; border-radius: 999px; background: #6366f1; }
</style>
