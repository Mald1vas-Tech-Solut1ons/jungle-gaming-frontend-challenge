import { getRouteApi, Link } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrderDetail } from '@/hooks/use-order'
import { normalizeError } from '@/lib/api'
import { OrderReceipt } from './order-receipt'
import { OrderStatusBanner } from './order-status-banner'

const routeApi = getRouteApi('/orders/$orderId')

export function OrderPage() {
  const { orderId } = routeApi.useParams()
  const { data: order, isLoading, error, refetch } = useOrderDetail(orderId)

  if (isLoading || (!order && !error)) return <OrderPageSkeleton />

  if (error || !order) {
    const apiErr = normalizeError(error)
    if (apiErr.code === 'NOT_FOUND') {
      return (
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 py-16 text-center">
          <p className="display-title text-primary">404</p>
          <h1 className="text-xl font-semibold text-foreground">Pedido não encontrado</h1>
          <p className="text-sm text-muted-foreground">O pedido que você procura não existe ou pertence a outra conta.</p>
          <Button asChild variant="outline">
            <Link to="/" search={{}}>Voltar ao início</Link>
          </Button>
        </div>
      )
    }
    return (
      <Alert variant="destructive">
        <AlertTitle>Não foi possível carregar o pedido</AlertTitle>
        <AlertDescription>{apiErr.message}</AlertDescription>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
          Tentar novamente
        </Button>
      </Alert>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="display-title text-foreground">Pedido</h1>
        <p className="font-mono text-xs text-muted-foreground">{order.id}</p>
      </header>

      <OrderStatusBanner status={order.status} rejectionReason={order.rejectionReason} />

      {order.status === 'rejected' ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-4">
            <p className="text-sm text-foreground">
              O pagamento foi recusado e o estoque reservado foi devolvido. Ajuste o carrinho e tente novamente.
            </p>
            <Button asChild data-testid="back-to-cart">
              <Link to="/cart">Voltar ao carrinho</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <OrderReceipt order={order} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function OrderPageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6" aria-label="Carregando pedido">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
