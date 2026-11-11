import { Link } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import type { Quote } from '@/api/contracts'
import { compareEth, formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

interface QuoteSummaryProps {
  quote: Quote | null
  isPending: boolean
  /** Linhas dos itens (o mobile mostra só os totais). */
  showLines?: boolean
}

/**
 * "Seus NFTs": linhas, subtotal, desconto, taxa de rede e total — TUDO da
 * cotação da API. Mantém o snapshot vigente enquanto uma nova cotação é
 * buscada (sem flicker); o valor que mudou pisca para chamar atenção.
 */
export function QuoteSummary({ quote, isPending, showLines = true }: QuoteSummaryProps) {
  if (!quote) {
    return isPending ? (
      <div className="space-y-3" aria-label="Carregando cotação">
        {showLines && (
          <>
            <Skeleton className="h-[70px] w-full" />
            <Skeleton className="h-[70px] w-full" />
          </>
        )}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-6 w-1/2" />
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">Aguardando cotação…</p>
    )
  }

  const hasDiscount = compareEth(quote.discount, '0') > 0

  return (
    <div data-testid="checkout-review" aria-busy={isPending}>
      {showLines && (
        <>
          <div className="flex justify-between border-b border-rule pb-2 text-base font-bold">
            <span>NFTs</span>
            <span>Subtotal</span>
          </div>
          <ul className="mt-2 space-y-3" aria-label="Itens da cotação">
            {quote.lines.map((line) => (
              <li key={`${line.nftId}:${line.editionId}`} className="flex items-center gap-3 bg-card p-1 pr-4">
                <img src={line.image} alt="" width={140} height={140} className="size-[70px] shrink-0 rounded-sm object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground" title={line.name}>{line.name}</p>
                  <p className="truncate text-sm text-tan">Edição: {line.editionName}</p>
                </div>
                <span className="shrink-0 text-sm text-muted-foreground">(x {line.quantity})</span>
                <span key={line.lineTotal} className="animate-fade whitespace-nowrap text-base font-bold text-accent">
                  {formatEth(line.lineTotal)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center text-sm text-foreground">
            Tem um código promocional?{' '}
            <Link to="/cart" className="text-accent underline-offset-4 hover:underline">
              Aplique no carrinho
            </Link>
          </p>
        </>
      )}

      <dl className={cn('space-y-2 text-base', showLines && 'mt-4')}>
        <div className="flex items-center justify-between">
          <dt>Subtotal</dt>
          <dd data-testid="quote-subtotal" className="text-lg">
            {formatEth(quote.subtotal)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>{quote.coupon ? `Desconto (${quote.coupon.code} −${quote.coupon.percentOff}%)` : 'Desconto do lançamento'}</dt>
          <dd data-testid="quote-discount" className={hasDiscount ? 'text-success' : undefined}>
            (−) {formatEth(quote.discount)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Taxa de rede</dt>
          <dd data-testid="quote-fee" className="text-lg">
            {formatEth(quote.networkFee)}
          </dd>
        </div>
        <p className="text-right text-xs text-accent">Taxa estimada</p>
        <div className="flex items-center justify-between border-t border-rule pt-3">
          <dt className="font-bold">Total</dt>
          <dd key={quote.total} data-testid="quote-total" className="animate-fade text-xl font-bold text-accent">
            {formatEth(quote.total)}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-tan">Cotação válida por 5 minutos e revalidada no envio do pedido.</p>
    </div>
  )
}
