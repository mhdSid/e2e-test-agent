/**
 * TYPE-DRIVEN SEED DATA (Layer 4 payload, deterministic)
 *
 * Given a field's TypeShape and the recipe operator/value that a branch's guard requires,
 * synthesize a JSON-serializable value that SATISFIES the guard — enough to render the
 * branch so the seeded probe can observe it. Values come from the declared TYPE, never from
 * the field's name (no keyword matching): `string → "sample"`, `number → 1`, an array whose
 * length must be > 0 → one element, `=== 'confirmed'` → `"confirmed"`. The seeded probe
 * captures the real DOM as ground truth, so a type-valid value is a hypothesis reality checks
 * — it does not need to be semantically real. Where the type cannot be resolved, a __TODO__
 * marker is emitted (the honest scaffolding boundary), never a silent guess.
 */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

/**
 * A normalized, type-checker-agnostic description of a field's type. Produced by the store
 * schema extractor from `state()` initial values and `as T` annotations; consumed here. Kept
 * separate from ts-morph so this synthesizer is pure and trivially testable.
 */
export type TypeShape =
  | { kind: 'string' }
  | { kind: 'number' }
  | { kind: 'boolean' }
  | { kind: 'null' }
  | { kind: 'unknown' }
  | { kind: 'literal'; value: string | number | boolean }
  | { kind: 'union'; options: TypeShape[] }
  | { kind: 'array'; element: TypeShape }
  | { kind: 'object'; fields: Record<string, TypeShape> }

const TODO_KEY = '__TODO__'

export function todo (note: string): JsonValue {
  return { [TODO_KEY]: note }
}

/** Does a synthesized value contain any unresolved __TODO__ marker (recursively)? */
export function hasTodo (value: JsonValue): boolean {
  if (Array.isArray(value)) return value.some(hasTodo)
  if (value && typeof value === 'object') {
    if (TODO_KEY in value) return true
    return Object.values(value).some(hasTodo)
  }
  return false
}

function coerce (value: string, shape: TypeShape): JsonValue {
  switch (shape.kind) {
    case 'number': return Number(value)
    case 'boolean': return value === 'true'
    case 'literal': return shape.value
    default: return value
  }
}

/** A type-valid TRUTHY inhabitant of the shape, or a __TODO__ when the type is opaque. */
function truthyOf (shape: TypeShape): JsonValue {
  switch (shape.kind) {
    case 'string': return 'sample'
    case 'number': return 1
    case 'boolean': return true
    case 'literal': return shape.value
    case 'union': return truthyOf(shape.options[0] ?? { kind: 'unknown' })
    case 'array': return [truthyOf(shape.element)]
    case 'object': return objectOf(shape)
    case 'null': return todo('type is null — cannot be truthy')
    case 'unknown': return todo('unresolved type — provide a truthy value')
  }
}

/** A type-valid FALSY inhabitant of the shape. */
function falsyOf (shape: TypeShape): JsonValue {
  switch (shape.kind) {
    case 'string': return ''
    case 'number': return 0
    case 'boolean': return false
    case 'array': return []
    case 'object': return null
    case 'literal': return shape.value
    case 'union': return falsyOf(shape.options[0] ?? { kind: 'null' })
    case 'null': return null
    case 'unknown': return null
  }
}

/** Fill every field of an object shape with a truthy/representative value. */
function objectOf (shape: { kind: 'object'; fields: Record<string, TypeShape> }): JsonValue {
  const out: { [key: string]: JsonValue } = {}
  for (const [name, fieldShape] of Object.entries(shape.fields)) out[name] = truthyOf(fieldShape)
  return out
}

/** Pick a union option whose literal differs from `value` (for `!==`), else the first. */
function differingLiteral (shape: TypeShape, value: string): JsonValue {
  if (shape.kind === 'union') {
    for (const opt of shape.options) {
      if (opt.kind === 'literal' && String(opt.value) !== value) return opt.value
    }
  }
  if (shape.kind === 'number') return Number(value) + 1
  if (shape.kind === 'boolean') return value !== 'true'
  return `not-${value}`
}

/**
 * Synthesize a value for `field` that makes `operator value` true.
 * `.length`-style comparisons resolve to array length when the shape is an array; otherwise
 * comparison operators apply numerically. Truthy/falsy resolve to type inhabitants.
 */
export function synthSatisfying (shape: TypeShape, operator: string, value: string | null): JsonValue {
  switch (operator) {
    case 'truthy': return truthyOf(shape)
    case 'falsy': return falsyOf(shape)
    case '===':
    case '==': return value === null ? truthyOf(shape) : coerce(value, shape)
    case '!==':
    case '!=': return value === null ? falsyOf(shape) : differingLiteral(shape, value)
    case '>':
    case '>=': {
      if (shape.kind === 'array') return [truthyOf(shape.element)] // length > 0
      const n = Number(value ?? '0')
      return operator === '>' ? n + 1 : n
    }
    case '<':
    case '<=': {
      if (shape.kind === 'array') return [] // length < N (N > 0)
      const n = Number(value ?? '0')
      return operator === '<' ? n - 1 : n
    }
    default: return truthyOf(shape)
  }
}
