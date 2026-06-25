<template>
  <div v-if="open" v-testable="'nav'">menu</div>
</template>

<script lang="ts" setup>
import { useNav } from './useNav'

const { open } = useNav()
</script>
