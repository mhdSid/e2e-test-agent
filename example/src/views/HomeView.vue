<template>
  <div data-testid="home-root">
    <h1 data-testid="home-title">Hotel Booking</h1>
    <p data-testid="home-subtitle">Find and book your perfect stay</p>
    <div data-testid="home-actions">
      <RouterLink data-testid="home-cta-plans"  to="/plans">Browse Plans</RouterLink>
      <RouterLink data-testid="home-cta-search" to="/search">Search</RouterLink>
    </div>
  </div>
</template>
