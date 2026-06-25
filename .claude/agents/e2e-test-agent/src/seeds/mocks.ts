/**
 * GENERIC MOCK FORMAT (one shape for client + SSR)
 *
 * A nested lookup tree keyed origin → path → query → response:
 *
 *   {
 *     'http://localhost:5173': {
 *       '/hotel/v1/top': {
 *         '': { status: 200, body: { ... } },          // '' = default / any query
 *         'city_id=13': { status: 200, body: { ... } } // specific query variant
 *       }
 *     }
 *   }
 *
 * The SAME file is consumed by a Playwright client mock (page.route) and a Node SSR proxy that
 * flips outgoing requests through it — both resolve a request by origin + path + query.
 */
import type { JsonValue } from '../orchestrators/state-machine/seed-data'

export interface MockResponse {
  status: number
  body: JsonValue
}

/** origin → path → queryKey → response. queryKey is '' for default/any, else 'a=1&b=2' sorted. */
export type MockTree = Record<string, Record<string, Record<string, MockResponse>>>

export interface MockEntry {
  origin: string
  path: string
  /** normalized query string ('a=1&b=2' sorted), or '' for the default/any-query response. */
  query: string
  status: number
  body: JsonValue
}

/** Normalize a query object to a sorted 'k=v&k2=v2' string (stable lookup key). */
export function queryKey (query: Record<string, string> | undefined): string {
  if (!query) return ''
  return Object.keys(query).sort().map((k) => `${k}=${query[k]}`).join('&')
}

export function buildMockTree (entries: MockEntry[]): MockTree {
  const tree: MockTree = {}
  for (const e of entries) {
    const byPath = (tree[e.origin] ??= {})
    const byQuery = (byPath[e.path] ??= {})
    byQuery[e.query] = { status: e.status, body: e.body }
  }
  return tree
}

/** Render the mock tree as a committable module. */
export function emitMockTree (entries: MockEntry[]): string {
  return `export default ${JSON.stringify(buildMockTree(entries), null, 2)}\n`
}

/**
 * Resolve a request against the tree: exact query match, else the '' (default) response.
 * Used by both the Playwright client mock and the Node SSR proxy.
 */
export function matchTree (
  tree: MockTree,
  req: { origin: string; path: string; query?: Record<string, string> }
): MockResponse | null {
  const byQuery = tree[req.origin]?.[req.path]
  if (!byQuery) return null
  return byQuery[queryKey(req.query)] ?? byQuery[''] ?? null
}
