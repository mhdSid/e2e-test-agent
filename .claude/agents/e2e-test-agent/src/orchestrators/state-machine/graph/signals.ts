import { readFileSync } from 'fs'
import { Node, SyntaxKind, type CallExpression, type Node as TsNode } from 'ts-morph'
import { sourceFor } from './ts-project'
import { refsOfNode } from './expression'
import { resolveModule } from './resolve'
import type { Signal, SignalKind } from './types'

export interface ScriptModel {
  signals: Map<string, Signal>
  importMap: Record<string, string>
  localImports: string[]
  globalImports: string[]
  props: string[]
  storesUsed: string[]
  /** handler/function name → signal roots it writes (assignments, ++/--). */
  handlerMutations: Record<string, string[]>
  /** handler/function name → route paths it navigates to (router.push/replace). */
  handlerNavigations: Record<string, string[]>
}

/** Root signals written by assignments / increments anywhere inside a node. */
function mutationsIn (node: TsNode): string[] {
  const out = new Set<string>()
  const record = (lhs: TsNode | undefined): void => {
    const root = lhs ? refsOfNode(lhs).roots[0] : undefined
    if (root) out.add(root)
  }
  const INCDEC = new Set(['++', '--'])
  for (const bin of node.getDescendantsOfKind(SyntaxKind.BinaryExpression)) {
    if (bin.getOperatorToken().getText() === '=') record(bin.getLeft())
  }
  for (const u of node.getDescendantsOfKind(SyntaxKind.PostfixUnaryExpression)) record(u.getOperand())
  for (const u of node.getDescendantsOfKind(SyntaxKind.PrefixUnaryExpression)) {
    if (INCDEC.has(u.getOperatorToken().toString())) record(u.getOperand())
  }
  return [...out]
}

/** Route paths a node navigates to — `router.push('/x')` / `.replace('/x')`. */
function navigationsIn (node: TsNode): string[] {
  const out: string[] = []
  for (const call of node.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const ex = call.getExpression()
    if (!Node.isPropertyAccessExpression(ex)) continue
    const method = ex.getName()
    if (method !== 'push' && method !== 'replace') continue
    const arg = call.getArguments()[0]
    if (arg && Node.isStringLiteral(arg)) {
      const value = arg.getLiteralValue()
      if (value.startsWith('/')) out.push(value)
    }
  }
  return out
}

const VUE_REFS = new Set(['ref', 'shallowRef'])
const VUE_REACTIVE = new Set(['reactive', 'shallowReactive'])
const storeModuleCache = new Map<string, boolean>()

function isLocal (spec: string): boolean {
  return spec.startsWith('.') || spec.startsWith('@/') || spec.startsWith('~/')
}

/** A module is a Pinia store if its source defines one — followed via the import graph, not its name. */
function moduleDefinesStore (spec: string, importerFile: string, aliases: Record<string, string>): boolean {
  const path = resolveModule(spec, importerFile, aliases)
  if (!path) return false
  const cached = storeModuleCache.get(path)
  if (cached !== undefined) return cached
  let result = false
  try {
    result = readFileSync(path, 'utf8').includes('defineStore')
  } catch {
    result = false
  }
  storeModuleCache.set(path, result)
  return result
}

function calleeName (call: CallExpression): string {
  const expr = call.getExpression()
  return Node.isIdentifier(expr) ? expr.getText() : expr.getText()
}

function classifyCall (
  call: CallExpression,
  importMap: Record<string, string>,
  importerFile: string,
  aliases: Record<string, string>
): { kind: SignalKind; deps: string[] } | null {
  const callee = calleeName(call)
  const module = importMap[callee]

  if (module === 'vue') {
    if (callee === 'computed') {
      const body = call.getArguments()[0]
      return { kind: 'computed', deps: body ? refsOfNode(body).roots : [] }
    }
    if (VUE_REFS.has(callee)) return { kind: 'ref', deps: refsOfNode(call).roots }
    if (VUE_REACTIVE.has(callee)) return { kind: 'reactive', deps: [] }
    return null
  }

  if (module === 'vue-router') return { kind: 'route', deps: [] }
  if (module && moduleDefinesStore(module, importerFile, aliases)) return { kind: 'store', deps: [] }
  if (module && !isLocal(module)) return null // unrelated external call (formatPrice etc. are local utils → composable below)

  // a call into a local/aliased composable that returns reactive bindings
  return module ? { kind: 'composable', deps: [] } : null
}

function extractProps (call: CallExpression): string[] {
  const props = new Set<string>()
  const typeArg = call.getTypeArguments()[0]
  if (typeArg && Node.isTypeLiteral(typeArg)) {
    for (const m of typeArg.getMembers()) if (Node.isPropertySignature(m)) props.add(m.getName())
  }
  const arg = call.getArguments()[0]
  if (arg && Node.isObjectLiteralExpression(arg)) {
    for (const p of arg.getProperties()) {
      if (Node.isPropertyAssignment(p) || Node.isShorthandPropertyAssignment(p)) props.add(p.getName())
    }
  }
  if (arg && Node.isArrayLiteralExpression(arg)) {
    for (const el of arg.getElements()) props.add(el.getText().replace(/['"`]/g, ''))
  }
  return [...props]
}

export function extractSignals (
  scriptContent: string,
  importerFile = '',
  aliases: Record<string, string> = {}
): ScriptModel {
  const sf = sourceFor(scriptContent)

  const importMap: Record<string, string> = {}
  const localImports: string[] = []
  const globalImports: string[] = []
  for (const imp of sf.getImportDeclarations()) {
    const spec = imp.getModuleSpecifierValue()
    ;(isLocal(spec) ? localImports : globalImports).push(spec)
    for (const named of imp.getNamedImports()) importMap[named.getName()] = spec
    const def = imp.getDefaultImport()
    if (def) importMap[def.getText()] = spec
  }

  const signals = new Map<string, Signal>()
  const storesUsed: string[] = []

  for (const decl of sf.getVariableDeclarations()) {
    const init = decl.getInitializer()
    if (!init || !Node.isCallExpression(init)) continue
    const nameNode = decl.getNameNode()

    // Bindings destructured from any call are reactive composable state
    // (e.g. `const { errors, meta } = useForm(...)`), even from an external package.
    const classified = classifyCall(init, importMap, importerFile, aliases)
      ?? (Node.isObjectBindingPattern(nameNode) ? { kind: 'composable' as SignalKind, deps: [] } : null)
    if (!classified) continue

    if (classified.kind === 'store') storesUsed.push(calleeName(init))

    if (Node.isIdentifier(nameNode)) {
      signals.set(nameNode.getText(), {
        name: nameNode.getText(),
        kind: classified.kind,
        deps: classified.deps,
        userMutable: false
      })
    } else if (Node.isObjectBindingPattern(nameNode)) {
      // const { errors, meta } = useForm(...) → each binding is a reactive signal
      for (const el of nameNode.getElements()) {
        const n = el.getNameNode().getText()
        signals.set(n, { name: n, kind: classified.kind, deps: classified.deps, userMutable: false })
      }
    }
  }

  // defineProps macro → prop signals
  const props: string[] = []
  for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    if (call.getExpression().getText() !== 'defineProps') continue
    for (const p of extractProps(call)) {
      props.push(p)
      if (!signals.has(p)) signals.set(p, { name: p, kind: 'prop', deps: [], userMutable: false })
    }
  }

  // handler name → signals it writes / routes it navigates to
  const handlerMutations: Record<string, string[]> = {}
  const handlerNavigations: Record<string, string[]> = {}
  const record = (name: string, body: TsNode): void => {
    handlerMutations[name] = mutationsIn(body)
    const nav = navigationsIn(body)
    if (nav.length) handlerNavigations[name] = nav
  }
  for (const fn of sf.getFunctions()) {
    const name = fn.getName()
    if (name) record(name, fn)
  }
  for (const decl of sf.getVariableDeclarations()) {
    const init = decl.getInitializer()
    if (init && (Node.isArrowFunction(init) || Node.isCallExpression(init) || Node.isFunctionExpression(init))) {
      record(decl.getName(), init)
    }
  }

  return {
    signals,
    importMap,
    localImports,
    globalImports,
    props,
    storesUsed: [...new Set(storesUsed)],
    handlerMutations,
    handlerNavigations
  }
}
