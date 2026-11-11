import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import type { Order } from '@/api/contracts'
import { compareEth, formatEth } from '@/lib/money'
import { CHAIN_LABELS, WALLET_PROVIDER_LABELS } from '@/lib/labels'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

/**
 * Recibo do pedido: snapshot imutável salvo na criação (linhas, subtotal,
 * desconto, taxa, total, colecionador e carteira). NUNCA recalcula valores a
 * partir do catálogo atual — mudanças de preço posteriores não o alteram.
 */
export function OrderReceipt({ order }: { order: Order }) {
  const hasDiscount = compareEth(order.discount, '0') > 0

  return (
    <div data-testid="order-receipt">
      {/* Faixa de resumo: transação · data · total · carteira */}
      <dl className="grid grid-cols-2 gap-y-4 border-y border-primary px-6 py-4 text-sm sm:grid-cols-4 sm:px-9">
        <div className="min-w-0 pr-3">
          <dt className="font-bold text-muted-foreground">ID da transação</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
            {order.txHash ? (
              <>
                <span data-testid="order-tx" title={order.txHash} className="block max-w-[10.5ch] truncate">
                  {order.txHash}
                </span>
                <button
                  type="button"
                  aria-label="Copiar ID da transação"
                  className="cursor-pointer text-tan transition-colors duration-200 hover:text-accent"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(order.txHash!)
                      .then(() => toast.success('ID da transação copiado.'))
                      .catch(() => toast.error('Não foi possível copiar.'))
                  }}
                >
                  <Copy className="size-3.5" aria-hidden="true" />
                </button>
              </>
            ) : (
              <span className="italic">Aguardando rede…</span>
            )}
          </dd>
        </div>
        <div className="sm:border-l sm:border-primary sm:pl-4">
          <dt className="text-muted-foreground">Data</dt>
          <dd className="mt-0.5 text-muted-foreground">{dateFormat.format(new Date(order.createdAt))}</dd>
        </div>
        <div className="sm:border-l sm:border-primary sm:pl-4">
          <dt className="text-muted-foreground">Total</dt>
          <dd className="mt-0.5 text-muted-foreground">{formatEth(order.total)}</dd>
        </div>
        <div className="min-w-0 sm:border-l sm:border-primary sm:pl-4">
          <dt className="font-bold text-muted-foreground">Carteira</dt>
          <dd className="mt-0.5 truncate text-muted-foreground" title={order.wallet.address}>
            {order.wallet.label} · {WALLET_PROVIDER_LABELS[order.wallet.provider]}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="receipt-details" className="px-6 pt-6 sm:px-11">
        <h2 id="receipt-details" className="text-base font-bold">
          Detalhes da transação
        </h2>
        <table className="mt-3 w-full text-left">
          <caption className="sr-only">Itens comprados</caption>
          <thead>
            <tr className="border-b border-rule text-base">
              <th scope="col" className="pb-2 font-bold">
                NFTs
              </th>
              <th scope="col" className="pb-2 text-center font-bold">
                Edições
              </th>
              <th scope="col" className="pb-2 text-right font-bold">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => (
              <tr key={`${line.nftId}:${line.editionId}`}>
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <img src={line.image} alt="" width={140} height={140} className="size-[66px] shrink-0 rounded-sm object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold">{line.name}</p>
                      <p className="truncate text-sm text-tan">Edição: {line.editionName}</p>
                    </div>
                  </div>
                </td>
                <td className="py-2 text-center text-sm text-muted-foreground">(x {line.quantity})</td>
                <td className="whitespace-nowrap py-2 text-right text-lg font-bold text-accent">{formatEth(line.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-3 flex max-w-xs flex-col gap-1.5 border-b border-rule pb-3 text-base">
          <div className="flex justify-between gap-6">
            <dt>Subtotal</dt>
            <dd>{formatEth(order.subtotal)}</dd>
          </div>
          {hasDiscount && (
            <div className="flex justify-between gap-6">
              <dt>Desconto{order.coupon ? ` (${order.coupon.code})` : ''}</dt>
              <dd className="text-success">−{formatEth(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-6">
            <dt>Taxa de rede</dt>
            <dd>{formatEth(order.networkFee)}</dd>
          </div>
          <div className="flex justify-between gap-6 font-bold">
            <dt>Total</dt>
            <dd data-testid="receipt-total" className="text-lg text-accent">
              {formatEth(order.total)}
            </dd>
          </div>
        </dl>

        <p className="mx-auto mt-4 max-w-md text-center text-sm leading-[1.7] text-muted-foreground">
          Pedido de <strong className="font-bold text-foreground">{order.collector.fullName}</strong> (@{order.collector.username}) na{' '}
          {CHAIN_LABELS[order.network]}. A propriedade é transferida para a carteira conectada e registrada na rede.
        </p>
        {order.collector.note && (
          <p className="mx-auto mt-2 max-w-md text-center text-xs italic text-tan">“{order.collector.note}”</p>
        )}
      </section>
    </div>
  )
}
