export interface CheckoutFormValues {
  name: string
  email: string
  phone: string
  players: number
}

export const checkoutSchema = {
  name: (v: string) => (v.length >= 2 ? true : 'Name too short'),
  email: (v: string) => (/^[^@]+@[^@]+$/.test(v) ? true : 'Invalid email'),
  phone: (v: string) => (/^\d{10}$/.test(v) ? true : 'Phone must be 10 digits'),
  players: (v: number) => (v >= 1 && v <= 4 ? true : 'Players must be 1-4')
}
