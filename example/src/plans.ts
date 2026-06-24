export interface Plan {
  id: number
  name: string
  price: number
  seats: number
  featured: boolean
}

export const PLANS: Plan[] = [
  { id: 1, name: 'Basic',    price: 3000, seats: 10, featured: false },
  { id: 2, name: 'Standard', price: 6000, seats: 5,  featured: true  },
  { id: 3, name: 'Premium',  price: 9000, seats: 0,  featured: true  }
]

export function formatPrice(price: number): string {
  return `¥${price.toLocaleString('ja-JP')}`
}
