<template>
  <Main v-if="canRender" v-testable="'m'" />
</template>

<script lang="ts" setup>
import { ref } from 'vue'

// A loading gate: a ref flipped false -> (await) -> true by an async hook, not by
// user input. Structurally distinguishable from a user-driven ref without name matching.
const canRender = ref(false)

async function load (): Promise<void> {
  canRender.value = false
  await Promise.resolve()
  canRender.value = true
}

load()
</script>
