import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { instantiateType } from '../../src/seeds/instantiate-type'

// Instantiate against the REAL in-repo hotel fixture (not a toy) — the dogfood target.
const TYPES = resolve(__dirname, '../../../../../packages/vue-app/src/api/hotel/prod/loadTop/types.ts')

describe('instantiate-type — Response type → ssrMock fixture body', () => {
  const { value, reviews } = instantiateType('HotelTopApi.Response', TYPES)

  it('builds the data[] envelope with one item', () => {
    const v = value as { data: unknown[] }
    expect(Array.isArray(v.data)).toBe(true)
    expect(v.data).toHaveLength(1)
  })

  it('instantiates nested interfaces across the namespace (Top → Hotel)', () => {
    const top = (value as any).data[0].top
    expect(top.featured_hotels).toHaveLength(1)
    expect(top.featured_hotels[0]).toMatchObject({
      hotel_id: 1,
      name: 'foo',
      image_url: 'foo',
      price_per_night: 1,
      rating: 1,
      room_count: 1
    })
    expect(top.promotions[0]).toMatchObject({ promo_id: 1, title: 'foo', url: 'foo' })
  })

  it('picks the first member of a string-literal union', () => {
    const top = (value as any).data[0].top
    expect(top.status).toBe('published')
    expect(top.featured_hotels[0].availability).toBe('available')
  })

  it('defaults Nullable<string> to null and reports it for review', () => {
    const top = (value as any).data[0].top
    expect(top.hero_image_url).toBeNull()
    expect(reviews.some((r) => r.includes('hero_image_url'))).toBe(true)
  })

  it('honors an override at a dot-path', () => {
    const out = instantiateType('HotelTopApi.Response', TYPES, { 'data[0].top.hero_image_url': '/hero.jpg' })
    expect((out.value as any).data[0].top.hero_image_url).toBe('/hero.jpg')
  })
})
