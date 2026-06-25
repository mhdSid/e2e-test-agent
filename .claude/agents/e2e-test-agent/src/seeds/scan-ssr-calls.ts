/**
 * SSR CALL SCANNER (RFC-3, network-mock path)
 *
 * Walks a page's SSR call graph to find the network calls whose Response types become ssrMock
 * fixtures. Coupled to the app's api convention:
 *   page → onServerPrefetch(cb) → loadApi('<entity>') → <entity>/index.prod → get(apiUrl)
 *          with `const path = '...'`, a typed `response: X.Response`, and `process.env.<TARGET>`.
 * onMounted and other client hooks are ignored (client-only). Structural throughout — follows
 * imports + AST, no text matching.
 */
import { readFileSync } from 'fs'
import { dirname } from 'path'
import { parse as parseSfc } from '@vue/compiler-sfc'
import { Node, SyntaxKind, type Node as TsNode, type SourceFile } from 'ts-morph'
import { sourceFor } from '../orchestrators/state-machine/graph/ts-project'
import { resolveModule } from '../orchestrators/state-machine/graph/resolve'

const SSR_HOOKS = new Set(['onServerPrefetch', 'useAsyncData', 'useLazyAsyncData', 'runWithContext'])

export interface ProdCall {
  entity: string
  path: string | null
  responseType: string
  typesFile: string | null
  target: string | null
}

function fileSource (path: string): SourceFile | null {
  try {
    let content = readFileSync(path, 'utf8')
    if (path.endsWith('.vue')) {
      const d = parseSfc(content).descriptor
      content = d.scriptSetup?.content ?? d.script?.content ?? ''
    }
    return sourceFor(content)
  } catch {
    return null
  }
}

function importMapOf (sf: SourceFile): Record<string, string> {
  const map: Record<string, string> = {}
  for (const imp of sf.getImportDeclarations()) {
    const spec = imp.getModuleSpecifierValue()
    for (const n of imp.getNamedImports()) map[n.getName()] = spec
    const def = imp.getDefaultImport()
    if (def) map[def.getText()] = spec
  }
  return map
}

/** Bodies of SSR-context callbacks on the page (inline or a referenced same-file binding). */
function ssrCallbackBodies (sf: SourceFile): TsNode[] {
  const bodies: TsNode[] = []
  for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    if (!SSR_HOOKS.has(call.getExpression().getText())) continue
    const arg = call.getArguments()[0]
    if (!arg) continue
    if (Node.isArrowFunction(arg) || Node.isFunctionExpression(arg)) {
      bodies.push(arg.getBody())
    } else if (Node.isIdentifier(arg)) {
      const name = arg.getText()
      const init = sf.getVariableDeclaration(name)?.getInitializer()
      if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) bodies.push(init.getBody())
      const fnBody = sf.getFunction(name)?.getBody()
      if (fnBody) bodies.push(fnBody)
    }
  }
  return bodies
}

/** Entities loaded in SSR context — `loadApi('<entity>')`. */
function entitiesIn (bodies: TsNode[]): string[] {
  const out = new Set<string>()
  for (const body of bodies) {
    for (const call of body.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      if (call.getExpression().getText() !== 'loadApi') continue
      const a = call.getArguments()[0]
      if (a && Node.isStringLiteral(a)) out.add(a.getLiteralValue())
    }
  }
  return [...out]
}

/** The first `const path = '/...'` in a scope, else the first '/'-prefixed string literal. */
function pathLiteralIn (scope: TsNode): string | null {
  for (const d of scope.getDescendantsOfKind(SyntaxKind.VariableDeclaration)) {
    if (d.getName() !== 'path') continue
    const init = d.getInitializer()
    if (init && Node.isStringLiteral(init)) return init.getLiteralValue()
  }
  for (const s of scope.getDescendantsOfKind(SyntaxKind.StringLiteral)) {
    const v = s.getLiteralValue()
    if (v.startsWith('/')) return v
  }
  return null
}

/** The base-URL env var referenced as `process.env.<NAME>` (not the computed proxy override). */
function envTargetIn (sf: SourceFile): string | null {
  for (const pae of sf.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)) {
    if (pae.getExpression().getText() === 'process.env') return pae.getName()
  }
  return null
}

/** Local (relative) module specifiers imported OR re-exported by a file. */
function localSpecs (sf: SourceFile): string[] {
  const specs: string[] = []
  for (const imp of sf.getImportDeclarations()) specs.push(imp.getModuleSpecifierValue())
  for (const exp of sf.getExportDeclarations()) {
    const spec = exp.getModuleSpecifierValue()
    if (spec) specs.push(spec)
  }
  return specs.filter((s) => s.startsWith('.'))
}

/** Typed `get()` network calls IN one file → seed metadata (target/types from that file). */
function callsInFile (sf: SourceFile, file: string, aliases: Record<string, string>): Array<Omit<ProdCall, 'entity'>> {
  const imap = importMapOf(sf)
  const target = envTargetIn(sf)
  const out: Array<Omit<ProdCall, 'entity'>> = []
  for (const decl of sf.getDescendantsOfKind(SyntaxKind.VariableDeclaration)) {
    const typeNode = decl.getTypeNode()
    const init = decl.getInitializer()
    if (!typeNode || !init) continue
    const callExpr = Node.isAwaitExpression(init) ? init.getExpression() : init
    if (!Node.isCallExpression(callExpr)) continue
    if (callExpr.getExpression().getText() !== 'get') continue

    const responseType = typeNode.getText()
    const typesSpec = imap[responseType.split('.')[0]]
    const typesFile = typesSpec ? resolveModule(typesSpec, file, aliases) : null
    const fn = decl.getFirstAncestor((a) =>
      Node.isFunctionDeclaration(a) || Node.isArrowFunction(a) || Node.isMethodDeclaration(a) || Node.isFunctionExpression(a))
    out.push({ path: pathLiteralIn(fn ?? sf), responseType, typesFile, target })
  }
  return out
}

const MAX_FOLLOW_DEPTH = 6

/**
 * From an entity's index.prod, find every typed `get()` call — FOLLOWING local imports and
 * re-exports into the per-operation modules (`./prod/loadTop`), since index.prod only
 * re-exports. The typed-get filter means non-network files contribute nothing.
 */
function extractFromProd (prodFile: string, aliases: Record<string, string>, seen = new Set<string>(), depth = 0): Array<Omit<ProdCall, 'entity'>> {
  if (seen.has(prodFile) || depth > MAX_FOLLOW_DEPTH) return []
  seen.add(prodFile)
  const sf = fileSource(prodFile)
  if (!sf) return []

  const out = callsInFile(sf, prodFile, aliases)
  for (const spec of localSpecs(sf)) {
    const resolved = resolveModule(spec, prodFile, aliases)
    if (resolved && !seen.has(resolved)) out.push(...extractFromProd(resolved, aliases, seen, depth + 1))
  }
  return out
}

export function scanSsrCalls (pageFile: string, aliases: Record<string, string> = {}): ProdCall[] {
  const pageSf = fileSource(pageFile)
  if (!pageSf) return []

  const entities = entitiesIn(ssrCallbackBodies(pageSf))
  const loadApiSpec = importMapOf(pageSf).loadApi
  const apiIndexPath = loadApiSpec ? resolveModule(loadApiSpec, pageFile, aliases) : null
  if (!apiIndexPath) return []

  const out: ProdCall[] = []
  for (const entity of entities) {
    const prodFile = resolveModule(`./${entity}/index.prod`, apiIndexPath, aliases)
    if (!prodFile) continue
    for (const call of extractFromProd(prodFile, aliases)) out.push({ entity, ...call })
  }
  return out
}
