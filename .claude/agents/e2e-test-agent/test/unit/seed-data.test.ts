import { describe, it, expect } from 'vitest'
import { synthSatisfying, hasTodo, todo, type TypeShape, type JsonValue } from '../../src/orchestrators/state-machine/seed-data'

const str: TypeShape = { kind: 'string' }
const num: TypeShape = { kind: 'number' }
const bool: TypeShape = { kind: 'boolean' }

describe('seed-data — type-driven satisfying-value synthesis', () => {
  it('=== literal yields that literal, coerced to the field type', () => {
    expect(synthSatisfying(str, '===', 'confirmed')).toBe('confirmed')
    expect(synthSatisfying(num, '===', '3')).toBe(3)
    expect(synthSatisfying(bool, '===', 'true')).toBe(true)
  })

  it('truthy resolves to a type inhabitant, never a name guess', () => {
    expect(synthSatisfying(str, 'truthy', null)).toBe('sample')
    expect(synthSatisfying(num, 'truthy', null)).toBe(1)
    expect(synthSatisfying(bool, 'truthy', null)).toBe(true)
  })

  it('truthy on an array gives a one-element array (length > 0)', () => {
    const arr: TypeShape = { kind: 'array', element: { kind: 'object', fields: { id: num, name: str } } }
    const v = synthSatisfying(arr, 'truthy', null) as JsonValue[]
    expect(Array.isArray(v)).toBe(true)
    expect(v).toHaveLength(1)
    expect(v[0]).toEqual({ id: 1, name: 'sample' })
  })

  it('> 0 on an array means non-empty; < on an array means empty', () => {
    const arr: TypeShape = { kind: 'array', element: str }
    expect(synthSatisfying(arr, '>', '0')).toEqual(['sample'])
    expect(synthSatisfying(arr, '<', '1')).toEqual([])
  })

  it('numeric comparisons resolve numerically when the field is a number', () => {
    expect(synthSatisfying(num, '>', '0')).toBe(1)
    expect(synthSatisfying(num, '>=', '5')).toBe(5)
    expect(synthSatisfying(num, '<', '10')).toBe(9)
  })

  it('falsy resolves to a falsy inhabitant of the type', () => {
    expect(synthSatisfying(str, 'falsy', null)).toBe('')
    expect(synthSatisfying(num, 'falsy', null)).toBe(0)
    expect(synthSatisfying(bool, 'falsy', null)).toBe(false)
    expect(synthSatisfying({ kind: 'array', element: str }, 'falsy', null)).toEqual([])
  })

  it('!== literal picks a differing union literal', () => {
    const status: TypeShape = {
      kind: 'union',
      options: [{ kind: 'literal', value: 'confirmed' }, { kind: 'literal', value: 'pending' }]
    }
    expect(synthSatisfying(status, '!==', 'confirmed')).toBe('pending')
  })

  it('emits a __TODO__ marker for unresolved types instead of guessing', () => {
    const v = synthSatisfying({ kind: 'unknown' }, 'truthy', null)
    expect(hasTodo(v)).toBe(true)
  })

  it('hasTodo detects markers nested in arrays and objects', () => {
    expect(hasTodo({ a: { b: [todo('x')] } })).toBe(true)
    expect(hasTodo({ a: { b: ['ok'] } })).toBe(false)
  })
})
