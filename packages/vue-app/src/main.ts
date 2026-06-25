import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from './App.vue'
import HomeView from './views/HomeView.vue'
import PlansView from './views/PlansView.vue'
import SearchView from './views/SearchView.vue'
import BookView from './views/BookView.vue'
import ConfirmView from './views/ConfirmView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/',           component: HomeView },
    { path: '/plans',      component: PlansView },
    { path: '/search',     component: SearchView },
    { path: '/book/:id',   component: BookView },
    { path: '/confirm',    component: ConfirmView }
  ]
})

createApp(App)
  .use(createPinia())
  .use(router)
  .mount('#app')
