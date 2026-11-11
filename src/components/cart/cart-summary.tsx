import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Quote } from '@/api/contracts'
import { compareEth, formatEth } from '@/lib/money'

interface CartTotalsProps {
  quote: Quote | null
}

/**
 * Totais do carrinho. Subtotal, desconto, taxa de rede e total SEMPRE vêm da
 * cotação da API (nunca calculados no cliente); o skeleton preserva as
 * dimensões enquanto a primeira cotação chega.
 */
export function CartTotals({ quote }: CartTotalsProps) {
  const hasDiscount = quote !== null && compareEth(quote.discount, '0') > 0
  const value = (testId: string, content: string | undefined, className?: string) =>
    content !== undefined ? (
      <dd key={content} data-testid={testId} className={`animate-fade ${className ?? ''}`}>
        {content}
      </dd>
    ) : (
      <dd>
        <Skeleton className="h-5 w-24" />
      </dd>
    )

  return (
    <dl className="space-y-2.5 text-base" aria-live="polite" aria-busy={quote === null}>
      <div className="flex items-center justify-between">
        <dt>Subtotal</dt>
        {value('cart-subtotal', quote ? formatEth(quote.subtotal) : undefined, 'text-lg')}
      </div>
      <div className="flex items-center justify-between">
        <dt>{quote?.coupon ? `Desconto (${quote.coupon.code} −${quote.coupon.percentOff}%)` : 'Desconto do lançamento'}</dt>
        {value('cart-discount', quote ? (hasDiscount ? `−${formatEth(quote.discount)}` : formatEth(quote.discount)) : undefined, hasDiscount ? 'text-success' : '')}
      </div>
      <div className="flex items-center justify-between">
        <dt>Taxa de rede</dt>
        {value('cart-fee', quote ? formatEth(quote.networkFee) : undefined, 'text-lg')}
      </div>
      <p className="text-right text-xs text-accent">Taxa estimada (Ethereum)</p>
      <div className="flex items-center justify-between pt-3">
        <dt className="font-bold">Total</dt>
        {value('cart-total', quote ? formatEth(quote.total) : undefined, 'text-xl font-bold text-accent')}
      </div>
    </dl>
  )
}

export function CheckoutCta({ disabled, pill = false }: { disabled: boolean; pill?: boolean }) {
  return (
    <Button
      asChild
      variant={pill ? 'pill' : 'default'}
      size={pill ? 'pill' : 'lg'}
      className={pill ? 'w-full' : 'h-11 w-full text-base'}
      data-testid="checkout-button"
      aria-disabled={disabled || undefined}
    >
      <Link to="/checkout" disabled={disabled}>
        Conectar e finalizar
      </Link>
    </Button>
  )
}
