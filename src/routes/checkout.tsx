import { createFileRoute, redirect } from '@tanstack/react-router'
import { CheckoutPage } from '@/components/checkout/checkout-page'
import { getToken } from '@/lib/session'

export const Route = createFileRoute('/checkout')({
  beforeLoad: ({ location }) => {
    if (!getToken()) throw redirect({ to: '/login', search: { redirect: location.href } })
  },
  component: CheckoutPage,
})
