import { Project, Node, SyntaxKind, type SourceFile } from 'ts-morph'
import type { ComputedDep } from './types'

export interface ScriptFacts {
  computeds: ComputedDep[]
  localImports: string[]
  globalImports: string[]
  /** imported name → module specifier, used to auto-resolve component sources */
  importMap: Record<string, string>
  /** defineProps names */
  props: string[]
  /** Pinia stores referenced (useXxxStore) */
  storesUsed: string[]
}

// One in-memory project, reused across calls — `<script setup>` bodies are parsed
// with the real TypeScript AST instead of brittle regexes.
const project = new Project({
  useInMemoryFileSystem: true,
  compilerOptions: { allowJs: true, checkJs: false }
})

const STORE_RE = /^use[A-Z]\w*Store$/

function isLocal (spec: string): boolean {
  return spec.startsWith('.') || spec.startsWith('@/') || spec.startsWith('~/')
}

function parseImports (sf: SourceFile): Pick<ScriptFacts, 'localImports' | 'globalImports' | 'importMap'> {
  const localImports: string[] = []
  const globalImports: string[] = []
  const importMap: Record<string, string> = {}

  for (const imp of sf.getImportDeclarations()) {
    const spec = imp.getModuleSpecifierValue()
    ;(isLocal(spec) ? localImports : globalImports).push(spec)
    for (const named of imp.getNamedImports()) importMap[named.getName()] = spec
    const def = imp.getDefaultImport()
    if (def) importMap[def.getText()] = spec
  }

  return { localImports, globalImports, importMap }
}

function parseComputeds (sf: SourceFile): ComputedDep[] {
  const computeds: ComputedDep[] = []

  for (const decl of sf.getVariableDeclarations()) {
    const init = decl.getInitializer()
    if (!init || !Node.isCallExpression(init)) continue
    if (init.getExpression().getText() !== 'computed') continue

    const deps = new Set<string>()
    init.forEachDescendant((node) => {
      if (!Node.isPropertyAccessExpression(node)) return
      const base = node.getExpression().getText()
      const member = node.getName()
      if (member === 'value') deps.add(base) // ref.value → ref
      else if (base === 'props') deps.add(member) // props.x → x
    })
    computeds.push({ name: decl.getName(), deps: [...deps] })
  }

  return computeds
}

function parseProps (sf: SourceFile): string[] {
  const props = new Set<string>()

  for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    if (call.getExpression().getText() !== 'defineProps') continue

    const typeArg = call.getTypeArguments()[0]
    if (typeArg && Node.isTypeLiteral(typeArg)) {
      for (const member of typeArg.getMembers()) {
        if (Node.isPropertySignature(member)) props.add(member.getName())
      }
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
  }

  return [...props]
}

function parseStores (sf: SourceFile): string[] {
  const stores = new Set<string>()
  for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const expr = call.getExpression().getText()
    if (STORE_RE.test(expr)) stores.add(expr)
  }
  return [...stores]
}

export function parseScript (scriptContent: string): ScriptFacts {
  const sf = project.createSourceFile('__script.ts', scriptContent, { overwrite: true })
  const { localImports, globalImports, importMap } = parseImports(sf)
  return {
    computeds: parseComputeds(sf),
    localImports,
    globalImports,
    importMap,
    props: parseProps(sf),
    storesUsed: parseStores(sf)
  }
}
