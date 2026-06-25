<template>
  <div data-testid="dashboard-root">
    <h1 data-testid="dashboard-title">Analytics Dashboard</h1>
    <MainContainer data-testid="main-container-slot" />
  </div>
</template>
<script lang="ts" setup>
import MainContainer from '../components/dashboard/MainContainer.vue'
</script>
