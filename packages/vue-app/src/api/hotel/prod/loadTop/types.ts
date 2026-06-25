// Per-endpoint response contract for GET /hotel/v1/top, nested under the entity's types/.
// data[] envelope, snake_case fields, Nullable<>, and the availability union are the
// conventions the seed type-instantiator handles.
export type Nullable<T> = T | null

export namespace HotelTopApi {
  export interface Request {
    city_id: number
  }

  export interface Response {
    data: ResponseItem[]
  }

  export interface ResponseItem {
    top: Top
  }

  export interface Top {
    featured_hotels: Hotel[]
    promotions: Promo[]
    hero_image_url: Nullable<string>
    status: 'published' | 'draft'
  }

  export interface Hotel {
    hotel_id: number
    name: string
    image_url: string
    price_per_night: number
    rating: number
    availability: 'available' | 'limited' | 'sold_out'
    room_count: number
  }

  export interface Promo {
    promo_id: number
    title: string
    url: string
  }
}
