<template>
  <div v-testable="'bs-root'">
    <!-- dynamic component: rendered tag not statically known -->
    <component :is="currentView" v-testable="'bs-dynamic'" />

    <!-- slot: content projected by the parent, not in this SFC -->
    <slot name="extra" />

    <!-- v-for whose rows render a component: per-row component states not enumerated -->
    <ul v-testable="'bs-list'">
      <li v-for="row in rows" :key="row.id">
        <StatusBadge :status="row.status" v-testable="'bs-row-badge'" />
      </li>
    </ul>

    <!-- guard reading inject()'d state: no static edge to the provider -->
    <section v-if="perm" v-testable="'bs-perm'">admin</section>
  </div>
</template>

<script lang="ts" setup>
import { ref, inject } from 'vue'

const currentView = ref('Home')
const rows = ref<Array<{ id: number; status: string }>>([])
const perm = inject('perm')
</script>
