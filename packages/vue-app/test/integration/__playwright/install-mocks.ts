import type { Page } from '@playwright/test'

/**
 * Consumes the generated mock tree (see ./mocks/**) as a Playwright CLIENT mock. Forces the
 * app onto its prod (real fetch) path via the __E2E__ flag, then fulfills every matching
 * request by origin → path → query. The SAME tree feeds the Node SSR proxy — one shape, two
 * consumers.
 */
export interface MockResponse {
  status: number
  body: unknown
}

export type MockTree = Record<string, Record<string, Record<string, MockResponse>>>

function queryKey (params: URLSearchParams): string {
  return [...params.keys()].sort().map((k) => `${k}=${params.get(k) ?? ''}`).join('&')
}

function resolve (tree: MockTree, origin: string, path: string, query: string): MockResponse | undefined {
  const byQuery = tree[origin]?.[path]
  if (!byQuery) return undefined
  return byQuery[query] ?? byQuery['']
}

export async function installMocks (page: Page, tree: MockTree): Promise<void> {
  await page.addInitScript(() => {
    ;(window as unknown as { __E2E__: boolean }).__E2E__ = true
  })
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    const hit = resolve(tree, url.origin, url.pathname, queryKey(url.searchParams))
    if (hit) {
      await route.fulfill({ status: hit.status, contentType: 'application/json', body: JSON.stringify(hit.body) })
    } else {
      await route.continue()
    }
  })
}
