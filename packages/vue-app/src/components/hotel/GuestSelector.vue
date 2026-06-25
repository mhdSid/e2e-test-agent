<template>
  <div class="guests" v-testable="'guest-selector'">
    <CounterControl label="Adults" :count="adults" :min="1" @inc="adults++" @dec="adults--" />
    <CounterControl label="Children" :count="children" @inc="children++" @dec="children--" />
    <p class="guests__total" v-testable="'guest-total'">{{ adults + children }} guests</p>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import CounterControl from './CounterControl.vue'

defineProps<{ maxRooms: number }>()
const emit = defineEmits<{ change: [total: number] }>()

const adults = ref(2)
const children = ref(0)
watch([adults, children], () => emit('change', adults.value + children.value))
</script>

<style scoped>
.guests { display: flex; flex-direction: column; gap: .5rem; padding: .75rem; background: #f8fafc; border-radius: 10px; }
.guests__total { margin: 0; font-size: .8rem; font-weight: 600; color: #2563eb; }
</style>
