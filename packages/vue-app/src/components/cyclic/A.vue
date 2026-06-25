<template><div data-testid="a"><div v-if="show" data-testid="a-on">on</div><B data-testid="b-slot" /></div></template>
<script lang="ts" setup>
import B from './B.vue'
defineProps<{ show?: boolean }>()
</script>
