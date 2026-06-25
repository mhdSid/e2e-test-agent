<template>
  <div v-if="foo" v-testable="'y'">visible</div>
  <button v-testable="'add'" @click="addItem">add</button>
</template>

<script lang="ts">
export default {
  data () {
    return { list: [] as number[] }
  },
  computed: {
    foo () {
      return this.list.length > 0
    }
  },
  methods: {
    addItem () {
      this.list = [...this.list, 1]
    }
  }
}
</script>
