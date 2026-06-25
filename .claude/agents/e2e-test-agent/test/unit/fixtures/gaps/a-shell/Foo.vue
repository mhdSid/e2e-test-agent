<template>
  <div v-if="bar" v-testable="'x'">visible</div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'

const items = ref<number[]>([])
const bar = computed(() => items.value.length > 0)
</script>
