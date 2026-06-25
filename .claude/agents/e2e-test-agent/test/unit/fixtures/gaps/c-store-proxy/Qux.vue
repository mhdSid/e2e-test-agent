<template>
  <div v-if="hasBar" v-testable="'z'">visible</div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import gen from './helpers'
import { useQuxStore } from './store'

const { bar } = gen(useQuxStore())
const hasBar = computed(() => !!bar.value)
</script>
