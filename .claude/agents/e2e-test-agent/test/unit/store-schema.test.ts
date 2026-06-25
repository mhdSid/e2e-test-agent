import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { extractStoreSchema } from '../../src/orchestrators/state-machine/graph/store-schema'
import { synthSatisfying, type TypeShape } from '../../src/orchestrators/state-machine/seed-data'

// importerFile only supplies the directory for relative resolution; it need not exist.
const IMPORTER = resolve(__dirname, 'fixtures/gaps/f-store/Caller.vue')
const schema = extractStoreSchema('./lessonStore', IMPORTER, {})!

describe('store-schema — defineStore state + getter extraction (types-only)', () => {
  it('reads the store id', () => {
    expect(schema.storeId).toBe('lesson')
  })

  it('derives primitive field shapes from initial values', () => {
    expect(schema.state.count.kind).toBe('number')
    expect(schema.state.region.kind).toBe('string')
    expect(schema.state.ready.kind).toBe('boolean')
  })

  it('resolves `[] as Lesson[]` to an array of the same-file interface shape', () => {
    const list = schema.state.recommendedLessonList
    expect(list.kind).toBe('array')
    const el = (list as { kind: 'array'; element: TypeShape }).element
    expect(el.kind).toBe('object')
    const fields = (el as { kind: 'object'; fields: Record<string, TypeShape> }).fields
    expect(fields.id.kind).toBe('number')
    expect(fields.name.kind).toBe('string')
    expect(fields.imageUrl.kind).toBe('string')
  })

  it('resolves a string-literal union annotation', () => {
    const status = schema.state.status
    expect(status.kind).toBe('union')
    const opts = (status as { kind: 'union'; options: TypeShape[] }).options
    expect(opts).toContainEqual({ kind: 'literal', value: 'confirmed' })
  })

  it('traces a getter to its backing state field + operator', () => {
    expect(schema.getters.hasLesson).toEqual({ access: 'recommendedLessonList', operator: '>', value: '0' })
    expect(schema.getters.isConfirmed).toEqual({ access: 'status', operator: '===', value: 'confirmed' })
  })

  it('end-to-end: a getter guard derives a concrete satisfying seed value', () => {
    // v-if="hasLesson" → getter → field recommendedLessonList, op '>' → non-empty typed array
    const g = schema.getters.hasLesson!
    const seed = synthSatisfying(schema.state[g.access], g.operator, g.value)
    expect(seed).toEqual([{ id: 1, name: 'sample', imageUrl: 'sample' }])
  })
})
