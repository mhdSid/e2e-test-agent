<template>
  <nav data-testid="nav">
    <RouterLink data-testid="nav-home"   to="/">Home</RouterLink>
    <RouterLink data-testid="nav-plans"  to="/plans">Plans</RouterLink>
    <RouterLink data-testid="nav-search" to="/search">Search</RouterLink>
    <RouterLink data-testid="nav-hotel"  to="/hotel/top">Hotels</RouterLink>
  </nav>
  <main>
    <RouterView />
  </main>
</template>
