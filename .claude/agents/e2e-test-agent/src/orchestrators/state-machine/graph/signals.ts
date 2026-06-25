import { readFileSync } from 'fs'
import { parse as parseSfc } from '@vue/compiler-sfc'
import {
  Node,
  SyntaxKind,
  type CallExpression,
  type Node as TsNode,
  type SourceFile,
  type ObjectLiteralExpression,
  type VariableDeclaration
} from 'ts-morph'
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
  /** bindings from inject() — provided by an ancestor, no static edge to the provider. */
  injected: string[]
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

// ── Options API support (GAP-2) ──────────────────────────────────────────────
// `export default { data, computed, methods, setup }` (optionally wrapped in
// defineComponent) holds reactive state in object members, not top-level variable
// declarations — so the <script setup> walk misses it entirely. The helpers below
// read those members structurally. `this.x` is resolved to `x` via the access chain,
// not a regex.

/** The component options object — `export default {...}` or `defineComponent({...})`. */
function getOptionsObject (sf: SourceFile): ObjectLiteralExpression | null {
  for (const exp of sf.getDescendantsOfKind(SyntaxKind.ExportAssignment)) {
    if (exp.isExportEquals()) continue
    let e: TsNode = exp.getExpression()
    if (Node.isCallExpression(e)) {
      const arg = e.getArguments()[0]
      if (arg) e = arg
    }
    if (Node.isObjectLiteralExpression(e)) return e
  }
  return null
}

/** Name of an object member (method, property, getter) or null. */
function memberName (prop: TsNode): string | null {
  const p = prop as { getName?: () => string }
  return typeof p.getName === 'function' ? p.getName() : null
}

/** The body node of a member: a method/function block, or an arrow/property expression. */
function memberBody (node: TsNode): TsNode | null {
  if (Node.isMethodDeclaration(node) || Node.isFunctionDeclaration(node) || Node.isGetAccessorDeclaration(node)) {
    return node.getBody() ?? null
  }
  if (Node.isPropertyAssignment(node)) {
    const init = node.getInitializer()
    if (!init) return null
    if (Node.isArrowFunction(init) || Node.isFunctionExpression(init)) return init.getBody() ?? null
    return init
  }
  if (Node.isArrowFunction(node) || Node.isFunctionExpression(node)) return node.getBody() ?? null
  return null
}

/** Entries of a member that is itself an object literal (`computed: {...}`, `methods: {...}`). */
function memberObjectEntries (prop: TsNode): Array<{ name: string; body: TsNode | null }> {
  const obj = Node.isPropertyAssignment(prop) ? prop.getInitializer() : null
  if (!obj || !Node.isObjectLiteralExpression(obj)) return []
  const out: Array<{ name: string; body: TsNode | null }> = []
  for (const m of obj.getProperties()) {
    const name = memberName(m)
    if (name) out.push({ name, body: memberBody(m) })
  }
  return out
}

/** Keys returned by `data()` / `data: () => ({...})` — each is a reactive ref. */
function dataReturnKeys (prop: TsNode): string[] {
  const body = memberBody(prop)
  if (!body) return []
  const objs: ObjectLiteralExpression[] = []
  if (Node.isParenthesizedExpression(body)) {
    const inner = body.getExpression()
    if (Node.isObjectLiteralExpression(inner)) objs.push(inner)
  } else if (Node.isObjectLiteralExpression(body)) {
    objs.push(body)
  } else {
    for (const ret of body.getDescendantsOfKind(SyntaxKind.ReturnStatement)) {
      const e = ret.getExpression()
      if (e && Node.isObjectLiteralExpression(e)) objs.push(e)
    }
  }
  const keys: string[] = []
  for (const obj of objs) {
    for (const p of obj.getProperties()) {
      const n = memberName(p)
      if (n) keys.push(n)
    }
  }
  return keys
}

/** Signal roots an Options API expression reads — `this.x` collapses to `x`. */
function optionsRoots (node: TsNode): string[] {
  const refs = refsOfNode(node)
  const out = new Set<string>()
  for (const root of refs.roots) if (root !== 'this') out.add(root)
  for (const a of refs.accesses) if (a.root === 'this' && a.path[0]) out.add(a.path[0])
  return [...out]
}

/** Signal roots an Options API method writes (`this.x = ...`, `this.x++`) — `this.x` → `x`. */
function optionsMutationsIn (node: TsNode): string[] {
  const out = new Set<string>()
  const recordLhs = (lhs: TsNode | undefined): void => {
    if (lhs) for (const r of optionsRoots(lhs)) out.add(r)
  }
  const INCDEC = new Set(['++', '--'])
  for (const bin of node.getDescendantsOfKind(SyntaxKind.BinaryExpression)) {
    if (bin.getOperatorToken().getText() === '=') recordLhs(bin.getLeft())
  }
  for (const u of node.getDescendantsOfKind(SyntaxKind.PostfixUnaryExpression)) recordLhs(u.getOperand())
  for (const u of node.getDescendantsOfKind(SyntaxKind.PrefixUnaryExpression)) {
    if (INCDEC.has(u.getOperatorToken().toString())) recordLhs(u.getOperand())
  }
  return [...out]
}

function isTruthyLiteral (node: TsNode): boolean {
  if (node.getKind() === SyntaxKind.TrueKeyword) return true
  if (Node.isNumericLiteral(node)) return Number(node.getLiteralValue()) !== 0
  if (Node.isStringLiteral(node)) return node.getLiteralValue() !== ''
  return false
}

function isFalsyLiteral (node: TsNode): boolean {
  const k = node.getKind()
  if (k === SyntaxKind.FalseKeyword || k === SyntaxKind.NullKeyword) return true
  if (node.getText() === 'undefined') return true
  if (Node.isNumericLiteral(node)) return Number(node.getLiteralValue()) === 0
  if (Node.isStringLiteral(node)) return node.getLiteralValue() === ''
  return false
}

/**
 * GAP-4: loading gates. A `ref` that an ASYNC function (with an await) toggles BOTH false
 * and true — `x.value = false; await load(); x.value = true` — is a data-loading gate, not
 * user input. Detected structurally (async + await + a falsy AND truthy literal write to the
 * same ref), no name matching. Reclassifying its kind makes a `v-if="x"` guard resolve to
 * `data` provenance ("wait for content"), not a user click.
 */
function detectLoadingGates (sf: SourceFile, signals: Map<string, Signal>): void {
  const scan = (fn: TsNode): void => {
    const asyncable = fn as { isAsync?: () => boolean }
    if (typeof asyncable.isAsync !== 'function' || !asyncable.isAsync()) return
    if (fn.getDescendantsOfKind(SyntaxKind.AwaitExpression).length === 0) return
    const truthy = new Set<string>()
    const falsy = new Set<string>()
    for (const bin of fn.getDescendantsOfKind(SyntaxKind.BinaryExpression)) {
      if (bin.getOperatorToken().getText() !== '=') continue
      const root = refsOfNode(bin.getLeft()).roots[0]
      if (!root || signals.get(root)?.kind !== 'ref') continue
      const rhs = bin.getRight()
      if (isTruthyLiteral(rhs)) truthy.add(root)
      else if (isFalsyLiteral(rhs)) falsy.add(root)
    }
    for (const name of truthy) {
      if (!falsy.has(name)) continue
      const s = signals.get(name)
      if (s) s.kind = 'loading-gate'
    }
  }
  for (const fn of sf.getDescendantsOfKind(SyntaxKind.FunctionDeclaration)) scan(fn)
  for (const fn of sf.getDescendantsOfKind(SyntaxKind.ArrowFunction)) scan(fn)
  for (const fn of sf.getDescendantsOfKind(SyntaxKind.FunctionExpression)) scan(fn)
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

const routeModuleCache = new Map<string, boolean>()

/**
 * A module's returned bindings are route-derived if its source actually CALLS `useRoute()`
 * — detected structurally via the AST (a real call expression), not a text match, so a
 * comment, a string, or `useRouter` (navigation, not route state) never trips it. Followed
 * through the import graph like moduleDefinesStore: `useStepCheck()` reading `route.query`
 * taints its bindings to `route`.
 */
function moduleReadsRoute (spec: string, importerFile: string, aliases: Record<string, string>): boolean {
  const path = resolveModule(spec, importerFile, aliases)
  if (!path) return false
  const cached = routeModuleCache.get(path)
  if (cached !== undefined) return cached
  let result = false
  try {
    let content = readFileSync(path, 'utf8')
    if (path.endsWith('.vue')) {
      const { descriptor } = parseSfc(content)
      content = descriptor.scriptSetup?.content ?? descriptor.script?.content ?? ''
    }
    const moduleSource = sourceFor(content)
    result = moduleSource
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .some((call) => call.getExpression().getText() === 'useRoute')
  } catch {
    result = false
  }
  routeModuleCache.set(path, result)
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
  aliases: Record<string, string>,
  resolveSignal?: (name: string) => SignalKind | undefined
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

  // Store taint through call arguments: store provenance flows through ANY wrapping call,
  // whether the arg is a store CALL (`generateHelpers(useFooStore())`, GAP-3) or a store
  // VARIABLE (`storeToRefs(store)`, the dominant Pinia pattern). Derived by data flow — not
  // by matching the name 'storeToRefs' — so any wrapper that takes a store is covered.
  for (const arg of call.getArguments()) {
    let argKind: SignalKind | undefined
    if (Node.isCallExpression(arg)) argKind = classifyCall(arg, importMap, importerFile, aliases, resolveSignal)?.kind
    else if (Node.isIdentifier(arg)) argKind = resolveSignal?.(arg.getText())
    if (argKind === 'store') return { kind: 'store', deps: [] }
  }

  if (module && !isLocal(module)) return null // unrelated external call (formatPrice etc. are local utils → composable below)
  if (!module) return null

  // GAP-6A: a composable whose source reads the route returns route-derived bindings
  // (e.g. `useStepCheck()` reading `route.query.step`) — classify them as `route`.
  if (moduleReadsRoute(module, importerFile, aliases)) return { kind: 'route', deps: [] }

  return { kind: 'composable', deps: [] }
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
  const injected: string[] = []

  // Classify one `const x = call(...)` declaration into the signal graph. Shared by the
  // top-level <script setup> walk and the Options API `setup()` body walk (GAP-2).
  const classifyAndStore = (decl: VariableDeclaration): void => {
    const init = decl.getInitializer()
    if (!init || !Node.isCallExpression(init)) return
    const nameNode = decl.getNameNode()

    // inject() — state provided by an ancestor; no static edge to the provider.
    if (calleeName(init) === 'inject' && Node.isIdentifier(nameNode)) {
      injected.push(nameNode.getText())
      return
    }

    // Bindings destructured from any call are reactive composable state
    // (e.g. `const { errors, meta } = useForm(...)`), even from an external package.
    // resolveSignal lets the store-taint see already-classified locals (storeToRefs(store)).
    const classified = classifyCall(init, importMap, importerFile, aliases, (n) => signals.get(n)?.kind)
      ?? (Node.isObjectBindingPattern(nameNode) ? { kind: 'composable' as SignalKind, deps: [] } : null)
    if (!classified) return

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

  for (const decl of sf.getVariableDeclarations()) classifyAndStore(decl)

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

  // GAP-2: Options API. data()→refs, computed→computed signals (this-aware deps),
  // methods→handlers (this-aware mutations/navigations), setup()→a nested <script setup>
  // scope run through the same classifier. Fires only when `export default {...}` exists,
  // so <script setup> components are untouched.
  const options = getOptionsObject(sf)
  if (options) {
    for (const prop of options.getProperties()) {
      const member = memberName(prop)
      if (!member) continue
      if (member === 'data') {
        for (const key of dataReturnKeys(prop)) {
          if (!signals.has(key)) signals.set(key, { name: key, kind: 'ref', deps: [], userMutable: false })
        }
      } else if (member === 'computed') {
        for (const entry of memberObjectEntries(prop)) {
          const deps = entry.body ? optionsRoots(entry.body) : []
          signals.set(entry.name, { name: entry.name, kind: 'computed', deps, userMutable: false })
        }
      } else if (member === 'methods') {
        for (const entry of memberObjectEntries(prop)) {
          if (!entry.body) continue
          handlerMutations[entry.name] = optionsMutationsIn(entry.body)
          const nav = navigationsIn(entry.body)
          if (nav.length) handlerNavigations[entry.name] = nav
        }
      } else if (member === 'setup') {
        const body = memberBody(prop)
        if (body) {
          for (const decl of body.getDescendantsOfKind(SyntaxKind.VariableDeclaration)) classifyAndStore(decl)
          for (const fn of body.getDescendantsOfKind(SyntaxKind.FunctionDeclaration)) {
            const name = fn.getName()
            if (name) record(name, fn)
          }
          for (const decl of body.getDescendantsOfKind(SyntaxKind.VariableDeclaration)) {
            const init = decl.getInitializer()
            if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) record(decl.getName(), init)
          }
        }
      }
    }
  }

  // Post-pass once every signal is known: reclassify data-loading gate refs (GAP-4).
  detectLoadingGates(sf, signals)

  return {
    signals,
    importMap,
    localImports,
    globalImports,
    props,
    storesUsed: [...new Set(storesUsed)],
    handlerMutations,
    handlerNavigations,
    injected: [...new Set(injected)]
  }
}
