/**
 * STORE SCHEMA EXTRACTION (deterministic, types-only)
 *
 * Parses a Pinia `defineStore` source into the shape the seed generator needs:
 *   - state:   field name → TypeShape, derived from `state()` initial VALUES and `as T`
 *              annotations (and same-file interfaces). No type-checker, no network.
 *   - getters: getter name → the comparison it makes on a state field, so a template guard
 *              that reads a getter (`v-if="hasLesson"`) can be traced to the backing field
 *              and operator (`recommendedLessonList`, `>`, `0`) to seed.
 *
 * Cross-file element interfaces that can't be resolved in-file are left as `unknown` →
 * the synthesizer emits a __TODO__ (the honest scaffolding boundary). No name guessing.
 */
import { readFileSync } from 'fs'
import { parse as parseSfc } from '@vue/compiler-sfc'
import { Node, SyntaxKind, type Node as TsNode, type SourceFile } from 'ts-morph'
import { sourceFor } from './ts-project'
import { resolveModule } from './resolve'
import { analyzeExpression } from './expression'
import type { Comparison } from './types'
import type { TypeShape } from '../seed-data'

export interface StoreSchema {
  storeId: string | null
  state: Record<string, TypeShape>
  /** getter name → the comparison it makes (access = backing state field), or null if opaque. */
  getters: Record<string, Comparison | null>
}

const schemaCache = new Map<string, StoreSchema | null>()

function readModuleSource (path: string): SourceFile | null {
  try {
    let content = readFileSync(path, 'utf8')
    if (path.endsWith('.vue')) {
      const { descriptor } = parseSfc(content)
      content = descriptor.scriptSetup?.content ?? descriptor.script?.content ?? ''
    }
    return sourceFor(content)
  } catch {
    return null
  }
}

/** TypeShape from a type annotation node (`as T`, interface members, unions of literals). */
function shapeFromType (node: TsNode | undefined, sf: SourceFile): TypeShape {
  if (!node) return { kind: 'unknown' }
  if (Node.isArrayTypeNode(node)) return { kind: 'array', element: shapeFromType(node.getElementTypeNode(), sf) }
  if (Node.isUnionTypeNode(node)) return { kind: 'union', options: node.getTypeNodes().map((t) => shapeFromType(t, sf)) }
  if (Node.isLiteralTypeNode(node)) {
    const lit = node.getLiteral()
    if (Node.isStringLiteral(lit)) return { kind: 'literal', value: lit.getLiteralValue() }
    if (Node.isNumericLiteral(lit)) return { kind: 'literal', value: Number(lit.getLiteralValue()) }
    if (lit.getKind() === SyntaxKind.TrueKeyword) return { kind: 'literal', value: true }
    if (lit.getKind() === SyntaxKind.FalseKeyword) return { kind: 'literal', value: false }
    return { kind: 'unknown' }
  }
  if (Node.isTypeLiteral(node)) return objectShapeFromMembers(node.getProperties(), sf)
  if (Node.isTypeReference(node)) {
    const name = node.getTypeName().getText()
    if (name === 'Array') return { kind: 'array', element: shapeFromType(node.getTypeArguments()[0], sf) }
    const iface = sf.getInterface(name)
    if (iface) return objectShapeFromMembers(iface.getProperties(), sf)
    const alias = sf.getTypeAlias(name)
    if (alias) return shapeFromType(alias.getTypeNode(), sf)
    return { kind: 'unknown' } // cross-file / unresolved → __TODO__ at synth time
  }
  switch (node.getKind()) {
    case SyntaxKind.StringKeyword: return { kind: 'string' }
    case SyntaxKind.NumberKeyword: return { kind: 'number' }
    case SyntaxKind.BooleanKeyword: return { kind: 'boolean' }
    case SyntaxKind.NullKeyword: return { kind: 'null' }
    default: return { kind: 'unknown' }
  }
}

function objectShapeFromMembers (members: Array<{ getName: () => string; getTypeNode: () => TsNode | undefined }>, sf: SourceFile): TypeShape {
  const fields: Record<string, TypeShape> = {}
  for (const m of members) fields[m.getName()] = shapeFromType(m.getTypeNode(), sf)
  return { kind: 'object', fields }
}

/** TypeShape from an initial VALUE (the `state()` literal): values reveal primitives/containers. */
function shapeFromValue (node: TsNode | undefined, sf: SourceFile): TypeShape {
  if (!node) return { kind: 'unknown' }
  if (Node.isAsExpression(node)) return shapeFromType(node.getTypeNode(), sf)
  if (Node.isArrayLiteralExpression(node)) {
    const first = node.getElements()[0]
    return { kind: 'array', element: first ? shapeFromValue(first, sf) : { kind: 'unknown' } }
  }
  if (Node.isObjectLiteralExpression(node)) {
    const fields: Record<string, TypeShape> = {}
    for (const p of node.getProperties()) {
      if (Node.isPropertyAssignment(p)) fields[p.getName()] = shapeFromValue(p.getInitializer(), sf)
    }
    return { kind: 'object', fields }
  }
  if (Node.isStringLiteral(node)) return { kind: 'string' }
  if (Node.isNumericLiteral(node)) return { kind: 'number' }
  const k = node.getKind()
  if (k === SyntaxKind.TrueKeyword || k === SyntaxKind.FalseKeyword) return { kind: 'boolean' }
  if (k === SyntaxKind.NullKeyword) return { kind: 'null' }
  return { kind: 'unknown' }
}

/** The object literal returned by `state: () => ({...})` / `state () { return {...} }`. */
function stateObject (stateProp: TsNode): TsNode | null {
  let body: TsNode | undefined
  if (Node.isPropertyAssignment(stateProp)) {
    const init = stateProp.getInitializer()
    body = (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) ? init.getBody() : init
  } else if (Node.isMethodDeclaration(stateProp)) {
    body = stateProp.getBody()
  }
  if (!body) return null
  if (Node.isParenthesizedExpression(body)) body = body.getExpression()
  if (Node.isObjectLiteralExpression(body)) return body
  for (const ret of body.getDescendantsOfKind(SyntaxKind.ReturnStatement)) {
    const e = ret.getExpression()
    if (e && Node.isObjectLiteralExpression(e)) return e
  }
  return null
}

/** A getter body's comparison, with the state-param / `this.` prefix stripped to the field. */
function getterComparison (getterProp: TsNode): Comparison | null {
  let param = 'state'
  let bodyText = ''
  const fnLike = Node.isPropertyAssignment(getterProp) ? getterProp.getInitializer() : getterProp
  if (fnLike && (Node.isArrowFunction(fnLike) || Node.isFunctionExpression(fnLike) || Node.isMethodDeclaration(fnLike))) {
    param = fnLike.getParameters()[0]?.getName() ?? 'state'
    const body = fnLike.getBody()
    if (!body) return null
    bodyText = Node.isBlock(body)
      ? (body.getDescendantsOfKind(SyntaxKind.ReturnStatement)[0]?.getExpression()?.getText() ?? '')
      : body.getText()
  }
  if (!bodyText) return null
  const comparison = analyzeExpression(bodyText).comparisons[0]
  if (!comparison) return null
  const strip = (access: string): string => {
    const pfx = `${param}.`
    if (access.startsWith(pfx)) return access.slice(pfx.length)
    if (access.startsWith('this.')) return access.slice('this.'.length)
    return access
  }
  // backing field = first segment after the prefix (drop `.length` etc.)
  const field = strip(comparison.access).split('.')[0]
  return { access: field, operator: comparison.operator, value: comparison.value }
}

/** Extract the schema for the store a module exports (resolved via the import graph). */
export function extractStoreSchema (spec: string, importerFile: string, aliases: Record<string, string> = {}): StoreSchema | null {
  const path = resolveModule(spec, importerFile, aliases)
  if (!path) return null
  const cached = schemaCache.get(path)
  if (cached !== undefined) return cached

  const sf = readModuleSource(path)
  let schema: StoreSchema | null = null

  if (sf) {
    for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      if (call.getExpression().getText() !== 'defineStore') continue
      const idArg = call.getArguments()[0]
      const optionsArg = call.getArguments()[1]
      const storeId = idArg && Node.isStringLiteral(idArg) ? idArg.getLiteralValue() : null
      const state: Record<string, TypeShape> = {}
      const getters: Record<string, Comparison | null> = {}

      if (optionsArg && Node.isObjectLiteralExpression(optionsArg)) {
        for (const prop of optionsArg.getProperties()) {
          const name = Node.isPropertyAssignment(prop) || Node.isMethodDeclaration(prop) ? prop.getName() : null
          if (name === 'state') {
            const obj = stateObject(prop)
            if (obj && Node.isObjectLiteralExpression(obj)) {
              for (const f of obj.getProperties()) {
                if (Node.isPropertyAssignment(f)) state[f.getName()] = shapeFromValue(f.getInitializer(), sf)
              }
            }
          } else if (name === 'getters') {
            const init = Node.isPropertyAssignment(prop) ? prop.getInitializer() : null
            if (init && Node.isObjectLiteralExpression(init)) {
              for (const g of init.getProperties()) {
                const gName = Node.isPropertyAssignment(g) || Node.isMethodDeclaration(g) ? g.getName() : null
                if (gName) getters[gName] = getterComparison(g)
              }
            }
          }
        }
      }
      schema = { storeId, state, getters }
      break
    }
  }

  schemaCache.set(path, schema)
  return schema
}
