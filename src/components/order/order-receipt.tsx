import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Order } from '@/api/contracts'
import { CHAIN_LABELS, WALLET_PROVIDER_LABELS } from '@/lib/labels'
import { formatEth } from '@/lib/money'

/**
 * Recibo do pedido: snapshot imutável salvo na criação (linhas, subtotal,
 * desconto, taxa, total, colecionador e carteira). NUNCA recalcula valores
 * a partir do catálogo atual.
 */
export function OrderReceipt({ order }: { order: Order }) {
  return (
    <div data-testid="order-receipt" className="space-y-6">
      {order.status === 'confirmed' && order.txHash && (
        <div className="rounded-lg border border-success/40 bg-success/10 p-4">
          <p className="text-xs uppercase tracking-wider text-success">Transação</p>
          <p data-testid="order-tx" className="mt-1 break-all font-mono text-xs text-foreground">
            {order.txHash}
          </p>
          {order.explorerUrl && (
            <a
              href={order.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs text-primary underline underline-offset-4 hover:text-accent"
            >
              Ver transação no explorador →
            </a>
          )}
        </div>
      )}

      <section aria-label="Itens do pedido">
        <h2 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Itens</h2>
        <ul className="space-y-3">
          {order.lines.map((line) => (
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
      </section>

      <Separator />

      <section aria-label="Valores do pedido">
        <h2 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Valores</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{formatEth(order.subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">
              Desconto{order.coupon ? ` (${order.coupon.code} −${order.coupon.percentOff}%)` : ''}
            </dt>
            <dd className={order.coupon ? 'text-success' : undefined}>
              {order.coupon ? `−${formatEth(order.discount)}` : formatEth(order.discount)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Taxa de rede ({CHAIN_LABELS[order.network]})</dt>
            <dd>{formatEth(order.networkFee)}</dd>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd className="text-primary">{formatEth(order.total)}</dd>
          </div>
        </dl>
      </section>

      <Separator />

      <div className="grid gap-6 sm:grid-cols-2">
        <section aria-label="Dados do colecionador">
          <h2 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Colecionador</h2>
          <div className="space-y-1 text-sm">
            <p className="font-medium text-foreground">{order.collector.fullName}</p>
            <p className="text-muted-foreground">{order.collector.email}</p>
            <p className="text-muted-foreground">{order.collector.country}</p>
            {order.collector.document && <p className="text-muted-foreground">{order.collector.document}</p>}
          </div>
        </section>
        <section aria-label="Carteira">
          <h2 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Carteira</h2>
          <div className="space-y-1 text-sm">
            <p className="flex items-center gap-2 font-medium text-foreground">
              {order.wallet.label}
              <Badge variant="outline">{WALLET_PROVIDER_LABELS[order.wallet.provider]}</Badge>
            </p>
            <p className="break-all font-mono text-xs text-muted-foreground">{order.wallet.address}</p>
          </div>
        </section>
      </div>
    </div>
  )
}
