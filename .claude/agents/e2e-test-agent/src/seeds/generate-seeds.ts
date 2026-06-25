/**
 * SEED GENERATOR CLI (RFC-3, network-mock path)
 *
 * yarn e2e:gen-seeds --page packages/vue-app/src/pages/hotel/TopView.vue
 *
 * Scans the page's SSR call graph → traces each network call's Response type → instantiates a
 * JS fixture → writes a generic mock module (one shape for client + SSR proxy) under the
 * Playwright output dir. Run from repo root.
 */
import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname, basename } from 'path'
import { scanSsrCalls } from './scan-ssr-calls'
import { instantiateType } from './instantiate-type'
import { emitMockTree, type MockEntry } from './mocks'
import { vueDemoAdapter } from '../adapters/vue-demo'

const DEFAULT_OUT = 'packages/vue-app/test/integration/__playwright'

function arg (name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

/** pages/hotel/TopView.vue → 'hotel/top' (drop the View suffix, lowercase). */
function pageSlug (pageFile: string): string {
  const afterPages = pageFile.split('/pages/')[1] ?? basename(pageFile)
  return afterPages
    .replace(/\.vue$/, '')
    .split('/')
    .map((s) => s.replace(/View$/, '').toLowerCase())
    .join('/')
}

function absAliases (aliases: Record<string, string> = {}): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, target] of Object.entries(aliases)) out[key] = resolve(process.cwd(), target)
  return out
}

function main (): void {
  const page = arg('page')
  if (!page) {
    console.error('usage: gen-seeds --page <pageFile> [--out-dir <dir>]')
    process.exitCode = 1
    return
  }

  const outDir = arg('out-dir') ?? DEFAULT_OUT
  const origin = arg('origin') ?? 'http://localhost:5173'
  const pageFile = resolve(process.cwd(), page)
  const aliases = absAliases(vueDemoAdapter.aliases as Record<string, string> | undefined)

  const calls = scanSsrCalls(pageFile, aliases)
  if (calls.length === 0) {
    console.error(`  ✗ no SSR network calls found in ${page}`)
    process.exitCode = 1
    return
  }

  const entries: MockEntry[] = []
  const reviews: string[] = []
  for (const call of calls) {
    if (!call.path || !call.typesFile) {
      console.warn(`  ⚠ skip ${call.responseType} — missing path or types file`)
      continue
    }
    const { value, reviews: fieldReviews } = instantiateType(call.responseType, call.typesFile)
    // query '' = default/any-query response; add specific query variants by hand if a branch needs them.
    entries.push({ origin, path: call.path, query: '', status: 200, body: value })
    reviews.push(...fieldReviews.map((r) => `${call.path} → ${r}`))
    console.log(`  ${origin}${call.path}  →  ${call.responseType}  (target ${call.target})  ✓`)
  }

  const slug = pageSlug(pageFile)
  const outPath = resolve(process.cwd(), outDir, 'mocks', `${slug}.ts`)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, emitMockTree(entries))
  console.log(`\nmocks → ${outPath}`)

  if (reviews.length) {
    console.log('\nreview (nullable/optional → null; fill if a branch needs them non-null):')
    for (const review of reviews) console.log(`  • ${review}`)
  }
}

main()
