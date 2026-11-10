import { AlertCircle, CheckCircle2 } from 'lucide-react'
import type { OrderStatus } from '@/api/contracts'
import { cn } from '@/lib/utils'

interface OrderStatusBannerProps {
  status: OrderStatus
  rejectionReason: string | null
}

/**
 * Banner de status do pedido, com `role="status"`/`aria-live` para anunciar
 * mudanças (pending → confirmed/rejected) a leitores de tela. A confirmação
 * só aparece quando a simulação efetivamente confirmar (nunca otimista).
 */
export function OrderStatusBanner({ status, rejectionReason }: OrderStatusBannerProps) {
  return (
    <div
      data-testid="order-status"
      role="status"
      aria-live="polite"
      className={cn(
        'rounded-lg border px-4 py-3',
        status === 'pending' && 'border-warning/50 bg-warning/10 text-warning',
        status === 'confirmed' && 'border-success/50 bg-success/10 text-success',
        status === 'rejected' && 'border-destructive/50 bg-destructive/10 text-destructive',
      )}
    >
      <div className="flex items-start gap-3">
        {status === 'pending' && (
          <span className="relative mt-1 flex size-2.5 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-warning" />
          </span>
        )}
        {status === 'confirmed' && <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
        {status === 'rejected' && <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}

        <div className="min-w-0">
          {status === 'pending' && (
            <>
              <p className="font-semibold">Aguardando confirmação na rede…</p>
              <p className="mt-1 text-xs opacity-80">
                O pagamento está sendo processado pela carteira. Esta página será atualizada automaticamente.
              </p>
            </>
          )}
          {status === 'confirmed' && (
            <>
              <p className="font-semibold">Pedido confirmado na rede!</p>
              <p className="mt-1 text-xs opacity-80">A transação foi registrada na blockchain. Recibo abaixo.</p>
            </>
          )}
          {status === 'rejected' && (
            <>
              <p className="font-semibold">Pagamento recusado</p>
              <p className="mt-1 text-xs opacity-80">{rejectionReason ?? 'Não foi possível concluir o pagamento.'}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
