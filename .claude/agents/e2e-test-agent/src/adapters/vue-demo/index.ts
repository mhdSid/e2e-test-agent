import type { Adapter } from '../../core/types'

/**
 * Adapter for the packages/vue-app Vue SPA (paths are relative to the monorepo root,
 * where the pipeline is run). Hash routing (createWebHashHistory) → all paths are /#/...
 *
 * Each route carries the SFC it renders. The probe navigates the route in a real
 * browser to capture the *default-rendered* selectors; the state machine parses the
 * SFC to enumerate *every* reachable state. Together they are the ground truth.
 */
const VIEWS = 'packages/vue-app/src/pages'

const routes = [
  { name: 'home', path: '/#/', sfc: `${VIEWS}/HomeView.vue` },
  { name: 'plans', path: '/#/plans', sfc: `${VIEWS}/PlansView.vue` },
  { name: 'search', path: '/#/search', sfc: `${VIEWS}/SearchView.vue` },
  { name: 'book-valid', path: '/#/book/1', sfc: `${VIEWS}/BookView.vue` },
  { name: 'book-soldout', path: '/#/book/3', sfc: `${VIEWS}/BookView.vue` },
  { name: 'confirm', path: '/#/confirm', sfc: `${VIEWS}/ConfirmView.vue` }
] as const

/**
 * No server-side journey posts — the Vue app is a SPA. Cross-state journeys
 * (book → confirm) are exercised in the generated spec by driving the form,
 * not by a probe POST. The state machine supplies the confirm-state selectors.
 */
const journeyPosts = [] as const

export const vueDemoAdapter: Adapter = {
  routes,
  journeyPosts,
  aliases: { '@/': 'packages/vue-app/src' }
}
