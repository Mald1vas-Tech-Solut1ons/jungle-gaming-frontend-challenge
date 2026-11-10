import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import type { Quote } from '@/api/contracts'
import { formatEth } from '@/lib/money'

interface QuoteSummaryProps {
  quote: Quote | null
  isPending: boolean
}

/**
 * Revisão do pedido: linhas, subtotal, desconto, taxa de rede e total —
 * TUDO da cotação da API. Exibe o snapshot vigente enquanto uma nova
 * cotação é buscada (sem flicker).
 */
export function QuoteSummary({ quote, isPending }: QuoteSummaryProps) {
  return (
    <div data-testid="checkout-review" className="space-y-4">
      {quote ? (
        <>
          <ul className="space-y-3" aria-label="Itens da cotação">
            {quote.lines.map((line) => (
              <li key={`${line.nftId}:${line.editionId}`} className="flex items-center gap-3">
                <img src={line.image} alt={line.name} className="size-12 shrink-0 rounded-md border border-border object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{line.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {line.editionName} · {line.quantity}× {formatEth(line.unitPrice)}
                  </p>
                </div>
                <span className="whitespace-nowrap text-sm text-foreground">{formatEth(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <Separator />
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd data-testid="quote-subtotal">{formatEth(quote.subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">
                Desconto{quote.coupon ? ` (${quote.coupon.code} −${quote.coupon.percentOff}%)` : ''}
              </dt>
              <dd data-testid="quote-discount" className={quote.coupon ? 'text-success' : undefined}>
                {quote.coupon ? `−${formatEth(quote.discount)}` : formatEth(quote.discount)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Taxa de rede</dt>
              <dd data-testid="quote-fee">{formatEth(quote.networkFee)}</dd>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-base font-semibold">
              <dt>Total</dt>
              <dd data-testid="quote-total" className="text-primary">
                {formatEth(quote.total)}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">Cotação válida por 5 minutos. Revise os valores antes de confirmar.</p>
        </>
      ) : isPending ? (
        <div className="space-y-3" aria-label="Carregando cotação">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Aguardando cotação…</p>
      )}
    </div>
  )
}
