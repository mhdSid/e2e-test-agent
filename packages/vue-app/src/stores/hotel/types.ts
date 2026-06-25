export interface Hotel {
  hotelId: number
  name: string
  imageUrl: string
  pricePerNight: number
  rating: number
  availability: 'available' | 'limited' | 'sold_out'
  roomCount: number
}

export interface Promo {
  promoId: number
  title: string
  url: string
}

export interface HotelCollection {
  featuredHotels: Hotel[]
  promotions: Promo[]
  heroImageUrl: string | null
}
