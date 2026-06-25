import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { scanSsrCalls } from '../../src/seeds/scan-ssr-calls'
import { instantiateType } from '../../src/seeds/instantiate-type'
import { emitMockTree, buildMockTree, matchTree, type MockEntry } from '../../src/seeds/mocks'

const ROOT = resolve(__dirname, '../../../../..')
const aliases = { '@/': resolve(ROOT, 'packages/vue-app/src') }
const PAGE = resolve(ROOT, 'packages/vue-app/src/pages/hotel/TopView.vue')

describe('scan-ssr-calls — page SSR call graph → prod network calls', () => {
  const calls = scanSsrCalls(PAGE, aliases)

  it('follows onServerPrefetch → loadApi → index.prod → prod/loadTop → the typed get()', () => {
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      entity: 'hotel',
      path: '/hotel/v1/top',
      responseType: 'HotelTopApi.Response',
      target: 'API_ORIGIN'
    })
  })

  it('resolves the per-operation types file across the re-export chain', () => {
    expect(calls[0].typesFile?.endsWith('api/hotel/prod/loadTop/types.ts')).toBe(true)
  })
})

describe('end-to-end: scan → instantiate → emit origin/path/query mock tree', () => {
  const calls = scanSsrCalls(PAGE, aliases)
  const origin = 'http://localhost:5173'
  const entries: MockEntry[] = calls.map((c) => ({
    origin,
    path: c.path as string,
    query: '',
    status: 200,
    body: instantiateType(c.responseType, c.typesFile as string).value
  }))

  it('emits the nested origin → path → query tree', () => {
    const out = emitMockTree(entries)
    expect(out).toContain('export default')
    expect(out).toContain(`"${origin}"`)
    expect(out).toContain('"/hotel/v1/top"')
    expect(out).toContain('featured_hotels')
  })

  it('resolves a request by origin + path + query, with "" as the default fallback', () => {
    const tree = buildMockTree(entries)
    const hit = matchTree(tree, { origin, path: '/hotel/v1/top', query: { city_id: '13' } })
    expect(hit).not.toBeNull()
    expect((hit!.body as { data: unknown[] }).data).toHaveLength(1)
    expect(matchTree(tree, { origin: 'http://other', path: '/hotel/v1/top' })).toBeNull()
    expect(matchTree(tree, { origin, path: '/nope' })).toBeNull()
  })
})
