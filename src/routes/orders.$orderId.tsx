import { createFileRoute, redirect } from '@tanstack/react-router'
import { OrderPage } from '@/components/order/order-page'
import { getToken } from '@/lib/session'

export const Route = createFileRoute('/orders/$orderId')({
  beforeLoad: ({ location }) => {
    if (!getToken()) throw redirect({ to: '/login', search: { redirect: location.href } })
  },
  component: OrderPage,
})
