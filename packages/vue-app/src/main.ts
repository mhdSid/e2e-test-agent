import { createApp, type DirectiveBinding } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'

// v-testable="'x'" → data-testid="x" at runtime (1:1), mirroring Gora's prod directive.
// The static state machine reads the directive; the live DOM (probe + Playwright) sees the
// resulting data-testid.
const setTestid = (el: HTMLElement, binding: DirectiveBinding<string>): void => {
  if (binding.value) el.setAttribute('data-testid', String(binding.value))
}
import HomeView from './pages/HomeView.vue'
import PlansView from './pages/PlansView.vue'
import SearchView from './pages/SearchView.vue'
import BookView from './pages/BookView.vue'
import ConfirmView from './pages/ConfirmView.vue'
import HotelTopView from './pages/hotel/TopView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/',           component: HomeView },
    { path: '/plans',      component: PlansView },
    { path: '/search',     component: SearchView },
    { path: '/book/:id',   component: BookView },
    { path: '/confirm',    component: ConfirmView },
    { path: '/hotel/top',  component: HotelTopView }
  ]
})

const app = createApp(App)
app.directive('testable', { mounted: setTestid, updated: setTestid })
app.use(createPinia())
app.use(router)
app.mount('#app')
