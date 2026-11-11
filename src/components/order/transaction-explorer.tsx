import { Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { Order } from '@/api/contracts'
import { formatEth } from '@/lib/money'
import { CHAIN_LABELS } from '@/lib/labels'

const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'medium' })

/** Número de bloco determinístico derivado do hash (referência simulada). */
function blockFor(hash: string): string {
  let n = 0
  for (let i = 0; i < hash.length; i++) n = (n * 31 + hash.charCodeAt(i)) >>> 0
  return (18_400_000 + (n % 900_000)).toLocaleString('pt-BR')
}

function Field({ label, children, mono = false }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-wide text-tan">{label}</dt>
      <dd className={`mt-0.5 break-all text-sm ${mono ? 'font-mono text-muted-foreground' : 'text-foreground'}`}>{children}</dd>
    </div>
  )
}

/**
 * Explorador de transação SIMULADO, dentro do próprio app. O enunciado pede
 * que as referências de transação sejam simuladas — um link externo para um
 * domínio inexistente (`etherscan.mock`) é beco sem saída, não simulação.
 * Aqui os dados fictícios são apresentados num painel claramente rotulado.
 */
export function TransactionExplorer({ order }: { order: Order }) {
  const confirmed = order.status === 'confirmed'
  const txHash = order.txHash ?? ''

  const copy = (value: string, label: string) => {
    void navigator.clipboard
      .writeText(value)
      .then(() => toast.success(`${label} copiado.`))
      .catch(() => toast.error('Não foi possível copiar.'))
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-12 px-4 text-base" disabled={!confirmed}>
          Ver no Etherscan
          <ExternalLink aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Explorador da transação</DialogTitle>
          <DialogDescription>Simulação — a referência é fictícia, como todo o backend desta demonstração.</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-rule bg-surface-2/40 p-4">
          <dl className="grid gap-3 text-sm">
            <Field label="Status">
              <span className="inline-flex items-center gap-1.5 font-bold text-success">
                <span className="size-2 rounded-full bg-success" aria-hidden="true" /> Confirmado
              </span>
            </Field>
            <div>
              <Field label="Transação">
                <span className="flex items-start gap-2">
                  <span className="font-mono text-muted-foreground">{txHash}</span>
                  <button type="button" aria-label="Copiar hash da transação" className="mt-0.5 shrink-0 cursor-pointer text-tan transition-colors hover:text-accent" onClick={() => copy(txHash, 'Hash da transação')}>
                    <Copy className="size-3.5" aria-hidden="true" />
                  </button>
                </span>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rede">{CHAIN_LABELS[order.network]}</Field>
              <Field label="Bloco" mono>#{blockFor(txHash)}</Field>
            </div>
            <Field label="De (carteira)" mono>
              {order.wallet.address}
            </Field>
            <Field label="Para">Mercado Kurio · contrato de coleção (simulado)</Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor">{formatEth(order.total)}</Field>
              <Field label="Taxa de rede">{formatEth(order.networkFee)}</Field>
            </div>
            <Field label="Registrada em">{dateTimeFormat.format(new Date(order.updatedAt))}</Field>
          </dl>
        </div>

        <p className="text-xs leading-relaxed text-tan">
          Na demonstração não há rede real: o hash, o bloco e os endereços são gerados de forma determinística pelo mock.
        </p>
      </DialogContent>
    </Dialog>
  )
}
