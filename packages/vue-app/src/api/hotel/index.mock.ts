import type { ApiActions } from '../index'
import { loadTop } from './mock/loadTop'

// Entity mock actions — aggregates the per-operation mock loaders under ./mock/*.
const actions: ApiActions = { loadTop }
export default actions
