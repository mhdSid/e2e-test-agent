<template><div data-testid="b"><div v-if="open" data-testid="b-on">on</div><A data-testid="a-slot" /></div></template>
<script lang="ts" setup>
import A from './A.vue'
defineProps<{ open?: boolean }>()
</script>
