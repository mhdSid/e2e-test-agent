import type { Adapter } from '../core/types'
import { vueDemoAdapter } from './vue-demo/index'
import { ADAPTERS } from '../core/constants'

export function resolveAdapter (name: string): Adapter {
  if (name === ADAPTERS.VUE_DEMO) return vueDemoAdapter
  throw new Error(`Unknown adapter: ${name}. Available: ${ADAPTERS.VUE_DEMO}`)
}
