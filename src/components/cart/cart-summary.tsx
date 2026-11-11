import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import type { Quote } from '@/api/contracts'
import { compareEth, formatEth } from '@/lib/money'

interface CartSummaryProps {
  quote: Quote | null
  quotePending: boolean
  itemsCount: number
}

/**
 * Resumo de valores do carrinho. Subtotal, desconto, taxa de rede e total
 * SEMPRE vêm da cotação da API (nunca calculados no cliente).
 */
export function CartSummary({ quote, quotePending, itemsCount }: CartSummaryProps) {
  const hasDiscount = quote !== null && compareEth(quote.discount, '0') > 0
  const loading = quote === null && quotePending

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          {quote ? <span data-testid="cart-subtotal">{formatEth(quote.subtotal)}</span> : <Skeleton className="h-4 w-24" />}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            Desconto{quote?.coupon ? ` (${quote.coupon.code} −${quote.coupon.percentOff}%)` : ''}
          </span>
          {quote ? (
            <span data-testid="cart-discount" className={hasDiscount ? 'text-success' : undefined}>
              {hasDiscount ? `−${formatEth(quote.discount)}` : formatEth(quote.discount)}
            </span>
          ) : (
            <Skeleton className="h-4 w-16" />
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Taxa de rede</span>
          {quote ? <span data-testid="cart-fee">{formatEth(quote.networkFee)}</span> : <Skeleton className="h-4 w-16" />}
        </div>
        <Separator />
        <div className="flex items-center justify-between text-base font-semibold">
          <span>Total</span>
          {quote ? (
            <span data-testid="cart-total" className="text-primary">
              {formatEth(quote.total)}
            </span>
          ) : (
            <Skeleton className="h-4 w-28" />
          )}
        </div>
      </div>

      {loading && <p className="text-xs text-muted-foreground">Calculando totais…</p>}

      <Button asChild size="lg" className="w-full" data-testid="checkout-button" disabled={itemsCount === 0}>
        <Link to="/checkout">Conectar e finalizar</Link>
      </Button>
      <Link to="/" search={{}} className="text-center text-xs text-muted-foreground transition-colors hover:text-foreground">
        Continuar explorando
      </Link>
    </div>
  )
}
