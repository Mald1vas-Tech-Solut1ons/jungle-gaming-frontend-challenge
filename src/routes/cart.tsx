import { createFileRoute } from '@tanstack/react-router'
import { CartPage } from '@/components/cart/cart-page'

export const Route = createFileRoute('/cart')({
  component: CartPage,
})
