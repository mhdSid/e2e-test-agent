/**
 * TYPE INSTANTIATOR (RFC-3, network-mock path)
 *
 * Given an API Response type name and the file it lives in, produce a JSON-serializable
 * fixture that the ssrMock returns. Uses a DISK-backed ts-morph project + the type checker
 * (NOT the in-memory snippet project) so cross-file types, namespaces, `Nullable<T>` aliases,
 * unions and the `data[]` envelope all resolve. Defaults come from the declared TYPE
 * (string→'foo', number→1, boolean→true); nullable/optional fields default to null and are
 * reported for review. `overrides` (recipe-driven, dot-path keyed) force specific values.
 */
import { Project, Node, type Type } from 'ts-morph'
import type { JsonValue } from '../orchestrators/state-machine/seed-data'

export interface InstantiateResult {
  value: JsonValue
  /** dot-paths defaulted to null (nullable/optional) — the human review items. */
  reviews: string[]
}

const MAX_DEPTH = 16

let diskProject: Project | null = null

function project (): Project {
  if (!diskProject) {
    // strictNullChecks MUST be on, else `T | null` collapses to `T` and we'd miss nullables.
    diskProject = new Project({
      compilerOptions: { strictNullChecks: true, skipLibCheck: true, noEmit: true }
    })
  }
  return diskProject
}

/** Resolve `Ns.Sub.TypeName` (or a bare type name) to its checker Type within `typesFile`. */
function resolveNamedType (typeName: string, typesFile: string): Type | null {
  const proj = project()
  let sf
  try {
    sf = proj.getSourceFile(typesFile) ?? proj.addSourceFileAtPath(typesFile)
  } catch {
    return null // unreadable / missing types file
  }
  proj.resolveSourceFileDependencies()

  const parts = typeName.split('.')
  const leaf = parts[parts.length - 1]

  let containerInterfaces = sf.getInterface(leaf)
  let containerAlias = sf.getTypeAlias(leaf)

  if (parts.length > 1) {
    let mod = sf.getModule(parts[0])
    for (let i = 1; i < parts.length - 1 && mod; i++) mod = mod.getModule(parts[i])
    containerInterfaces = mod?.getInterface(leaf)
    containerAlias = mod?.getTypeAlias(leaf)
  }

  const decl = containerInterfaces ?? containerAlias
  return decl ? decl.getType() : null
}

function isNullableUnion (type: Type): boolean {
  return type.isUnion() && type.getUnionTypes().some((t) => t.isNull() || t.isUndefined())
}

function walk (type: Type, overrides: Record<string, JsonValue>, path: string, reviews: string[], depth: number, seen: Set<string>): JsonValue {
  if (path in overrides) return overrides[path]
  if (depth > MAX_DEPTH) return null

  if (type.isString()) return 'foo'
  if (type.isNumber()) return 1
  if (type.isBoolean()) return true
  if (type.isStringLiteral()) return type.getLiteralValue() as string
  if (type.isNumberLiteral()) return type.getLiteralValue() as number
  if (type.isBooleanLiteral()) return type.getText() === 'true'
  if (type.isNull() || type.isUndefined()) return null

  if (isNullableUnion(type)) {
    reviews.push(path || '(root)')
    return null
  }
  if (type.isUnion()) {
    const first = type.getUnionTypes().find((t) => !t.isNull() && !t.isUndefined())
    return first ? walk(first, overrides, path, reviews, depth + 1, seen) : null
  }

  if (type.isArray()) {
    const el = type.getArrayElementType()
    return el ? [walk(el, overrides, `${path}[0]`, reviews, depth + 1, seen)] : []
  }

  if (type.isObject()) {
    const key = type.getText()
    if (seen.has(key)) return null // cycle guard
    seen.add(key)
    const result: { [k: string]: JsonValue } = {}
    for (const prop of type.getProperties()) {
      const decl = prop.getValueDeclaration()
      const name = prop.getName()
      const fieldPath = path ? `${path}.${name}` : name
      const optional = decl && Node.isPropertySignature(decl) ? decl.hasQuestionToken() : false
      if (optional && !(fieldPath in overrides)) {
        reviews.push(fieldPath)
        result[name] = null
        continue
      }
      const propType = decl ? prop.getTypeAtLocation(decl) : null
      result[name] = propType ? walk(propType, overrides, fieldPath, reviews, depth + 1, new Set(seen)) : null
    }
    return result
  }

  return null
}

export function instantiateType (
  typeName: string,
  typesFile: string,
  overrides: Record<string, JsonValue> = {}
): InstantiateResult {
  const type = resolveNamedType(typeName, typesFile)
  if (!type) return { value: null, reviews: [`type ${typeName} not found in ${typesFile}`] }
  const reviews: string[] = []
  const value = walk(type, overrides, '', reviews, 0, new Set())
  return { value, reviews }
}
