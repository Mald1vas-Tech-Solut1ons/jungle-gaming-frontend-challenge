import { getRouteApi, Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrderDetail } from '@/hooks/use-order'
import { normalizeError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { OrderReceipt } from './order-receipt'
import { OrderStatusBanner } from './order-status-banner'
import { TransactionExplorer } from './transaction-explorer'

const routeApi = getRouteApi('/orders/$orderId')

/** Envelope "THANK YOU" do layout, em SVG (traço âmbar). */
function ThankYouEnvelope({ pending }: { pending: boolean }) {
  return (
    <svg viewBox="0 0 72 84" className={cn('h-[84px] w-[72px] text-primary', pending ? 'animate-pulse' : 'animate-[float_4s_ease-in-out_infinite]')} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        <path d="M30 6 36 2l6 4" />
        <rect x="8" y="6" width="56" height="44" rx="4" fill="var(--color-card)" />
        <path d="M4 40v38a4 4 0 0 0 4 4h56a4 4 0 0 0 4-4V40" />
        <path d="M4 40l32 24 32-24" />
        <path d="M4 80l24-20M68 80 44 60" />
      </g>
      <text x="36" y="25" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" fontFamily="var(--font-sans)">
        THANK
      </text>
      <text x="36" y="38" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" fontFamily="var(--font-sans)">
        YOU
      </text>
    </svg>
  )
}

function CloseLink() {
  return (
    <Link
      to="/"
      aria-label="Fechar e voltar ao início"
      className="absolute right-5 top-5 rounded-sm text-accent transition-transform duration-200 hover:rotate-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <X className="size-5" aria-hidden="true" />
    </Link>
  )
}

/** Cartão central (600px) com faixa âmbar na base — tela standalone do layout. */
function Shell({ children }: { children: React.ReactNode }) {
  return <div className="relative w-full max-w-[600px] animate-rise border-b-[10px] border-primary bg-card pb-10 pt-6">{children}</div>
}

export function OrderPage() {
  const { orderId } = routeApi.useParams()
  const { data: order, isLoading, error, refetch } = useOrderDetail(orderId)

  if (isLoading || (!order && !error)) return <OrderPageSkeleton />

  if (error || !order) {
    const apiErr = normalizeError(error)
    if (apiErr.code === 'NOT_FOUND') {
      return (
        <Shell>
          <CloseLink />
          <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
            <p className="text-6xl font-bold text-accent">404</p>
            <h1 className="text-xl font-bold">Pedido não encontrado</h1>
            <p className="text-sm text-muted-foreground">O pedido que você procura não existe ou pertence a outra conta.</p>
            <Button asChild variant="outline">
              <Link to="/" search={{}}>
                Voltar ao início
              </Link>
            </Button>
          </div>
        </Shell>
      )
    }
    return (
      <Shell>
        <div className="px-6">
          <Alert variant="destructive">
            <AlertTitle>Não foi possível carregar o pedido</AlertTitle>
            <AlertDescription>{apiErr.message}</AlertDescription>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </Alert>
        </div>
      </Shell>
    )
  }

  const confirmed = order.status === 'confirmed'

  return (
    <Shell>
      <CloseLink />
      <header className="flex flex-col items-center gap-3 px-6 pb-5 text-center">
        <ThankYouEnvelope pending={order.status === 'pending'} />
        <h1 className="text-base font-bold text-muted-foreground">
          {confirmed ? 'Seus NFTs agora estão na sua carteira' : order.status === 'pending' ? 'Estamos confirmando sua compra' : 'Não foi possível concluir a compra'}
        </h1>
        <p className="text-xs text-tan">Pedido {order.id}</p>
      </header>

      <div className="px-6 pb-5 sm:px-11">
        <OrderStatusBanner status={order.status} rejectionReason={order.rejectionReason} />
      </div>

      {order.status === 'rejected' ? (
        <div className="flex flex-col items-center gap-4 px-6 text-center">
          <p className="max-w-sm text-sm text-muted-foreground">
            O pagamento foi recusado e o estoque reservado foi devolvido. Seus itens continuam no carrinho — ajuste e tente novamente.
          </p>
          <Button asChild data-testid="back-to-cart">
            <Link to="/cart">Voltar ao carrinho</Link>
          </Button>
        </div>
      ) : (
        <>
          <OrderReceipt order={order} />
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 px-6">
            <TransactionExplorer order={order} />
            <Button asChild variant="outline" className="h-12 px-4 text-base">
              <Link to="/" search={{}}>
                Continuar explorando
              </Link>
            </Button>
          </div>
        </>
      )}
    </Shell>
  )
}

function OrderPageSkeleton() {
  return (
    <div className="w-full max-w-[600px] border-b-[10px] border-primary bg-card px-6 pb-10 pt-8" aria-label="Carregando pedido">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-[84px] w-[72px]" />
        <Skeleton className="h-5 w-72" />
      </div>
      <Skeleton className="mt-8 h-14 w-full" />
      <Skeleton className="mt-6 h-[66px] w-full" />
      <Skeleton className="mt-3 h-[66px] w-full" />
      <Skeleton className="mx-auto mt-8 h-12 w-48" />
    </div>
  )
}
