import type { HotelTopApi } from './hotel/prod/loadTop/types'

/**
 * api entry point. `loadApi(entity)` returns that entity's available actions, choosing the
 * prod (network) or mock (fixture) implementation by environment — index.prod / index.mock.
 * The seed scanner follows the prod variant to the network call + per-endpoint Response type;
 * the mock variant renders the page locally with no network.
 */
export interface ApiActions {
  loadTop (args: HotelTopApi.Request): Promise<void>
}

// Static import registry per entity. A VARIABLE dynamic import (`./${entity}/index.${mode}`)
// fails in Vite dev ("Unknown variable dynamic import") because its glob can't match the .ts
// extension — only fully-static import() strings are analysable. The seed scanner finds prod
// loaders by the api/<entity>/index.prod convention, independent of this registry.
const REGISTRY: Record<string, { prod: () => Promise<unknown>; mock: () => Promise<unknown> }> = {
  hotel: {
    prod: () => import('./hotel/index.prod'),
    mock: () => import('./hotel/index.mock')
  }
}

export async function loadApi (entity: 'hotel'): Promise<ApiActions> {
  const appEnv = typeof process !== 'undefined' ? (process.env.APP_ENV ?? '') : ''
  const e2e = typeof globalThis !== 'undefined' && (globalThis as { __E2E__?: boolean }).__E2E__ === true
  const isProd = e2e || ['production', 'stage'].includes(appEnv)
  const loaders = REGISTRY[entity]
  const mod = await (isProd ? loaders.prod() : loaders.mock()) as { default?: ApiActions }
  return (mod.default ?? mod) as ApiActions
}
