<template>
  <div v-if="isStep1" v-testable="'s1'">one</div>
  <div v-else-if="isStep2" v-testable="'s2'">two</div>
</template>

<script lang="ts" setup>
import { useStepCheck } from './useStepCheck'

const { isStep1, isStep2 } = useStepCheck()
</script>
