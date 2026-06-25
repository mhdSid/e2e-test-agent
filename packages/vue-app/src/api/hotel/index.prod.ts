import type { ApiActions } from '../index'
import { loadTop } from './prod/loadTop'

// Entity prod actions — aggregates the per-operation prod loaders under ./prod/*.
const actions: ApiActions = { loadTop }
export default actions
