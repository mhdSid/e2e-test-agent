<template>
  <div class="counter" v-testable="'counter'">
    <button class="counter__btn" :disabled="count <= min" @click="$emit('dec')" v-testable="'counter-dec'">−</button>
    <span class="counter__value" v-testable="'counter-value'">{{ label }}: {{ count }}</span>
    <button class="counter__btn" @click="$emit('inc')" v-testable="'counter-inc'">+</button>
  </div>
</template>

<script lang="ts" setup>
withDefaults(defineProps<{ label: string; count: number; min?: number }>(), { min: 0 })
defineEmits<{ inc: []; dec: [] }>()
</script>

<style scoped>
.counter { display: inline-flex; align-items: center; gap: .5rem; }
.counter__btn {
  width: 1.9rem; height: 1.9rem; border-radius: 999px; border: 1px solid #d4d8e0;
  background: #fff; font-size: 1.1rem; line-height: 1; cursor: pointer; transition: all .15s ease;
}
.counter__btn:hover:not(:disabled) { border-color: #2563eb; color: #2563eb; }
.counter__btn:disabled { opacity: .4; cursor: not-allowed; }
.counter__value { font-size: .9rem; color: #334155; min-width: 6rem; text-align: center; }
</style>
