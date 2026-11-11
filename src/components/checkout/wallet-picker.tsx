import { Link } from '@tanstack/react-router'
import { Check, Wallet as WalletIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Wallet, WalletProvider } from '@/api/contracts'
import { CHAIN_LABELS, WALLET_PROVIDER_LABELS } from '@/lib/labels'
import { cn } from '@/lib/utils'

interface WalletPickerProps {
  wallets: Wallet[] | undefined
  isLoading: boolean
  selectedId: string | null
  connectingId: string | null
  /** Carteiras cuja conexão simulada já foi aceita nesta sessão. */
  connectedIds: string[]
  disabled: boolean
  onSelect: (id: string) => void
  onConnect: (id: string) => void
}

const PROVIDER_INITIAL: Record<WalletProvider, string> = {
  metamask: 'M',
  walletconnect: 'W',
  coinbase: 'C',
  phantom: 'P',
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

/**
 * "Carteira e rede": lista de carteiras cadastradas como radiogroup. Cada
 * linha mostra o provedor, a rede e a conexão simulada (aceita, recusada ou
 * desconectada pela API).
 */
export function WalletPicker({ wallets, isLoading, selectedId, connectingId, connectedIds, disabled, onSelect, onConnect }: WalletPickerProps) {
  if (isLoading && !wallets) {
    return (
      <div className="space-y-3" aria-label="Carregando carteiras">
        <Skeleton className="h-[72px] w-full rounded-xl" />
        <Skeleton className="h-[72px] w-full rounded-xl" />
      </div>
    )
  }

  if (!wallets || wallets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-rule p-5 text-sm text-muted-foreground" role="status">
        <p className="font-bold text-foreground">Nenhuma carteira cadastrada</p>
        <p className="mt-1">Cadastre uma carteira para concluir o pagamento.</p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link to="/wallets">Cadastrar carteira</Link>
        </Button>
      </div>
    )
  }

  return (
    <div role="radiogroup" aria-label="Carteira para pagamento" className="space-y-3">
      {wallets.map((wallet) => {
        const selected = wallet.id === selectedId
        const connected = connectedIds.includes(wallet.id)
        return (
          <div
            key={wallet.id}
            role="radio"
            aria-checked={selected}
            tabIndex={selected || !selectedId ? 0 : -1}
            data-testid="checkout-wallet"
            onClick={() => !disabled && onSelect(wallet.id)}
            onKeyDown={(e) => {
              if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                onSelect(wallet.id)
              }
            }}
            className={cn(
              'group flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-3.5 transition-[border-color,background-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected ? 'border-primary' : 'border-transparent hover:border-rule',
              disabled && 'pointer-events-none opacity-60',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-200',
                selected ? 'border-primary' : 'border-rule',
              )}
            >
              <span className={cn('size-2.5 rounded-full bg-primary transition-transform duration-200', selected ? 'scale-100' : 'scale-0')} />
            </span>
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-rule bg-tile text-sm font-bold text-accent"
            >
              {PROVIDER_INITIAL[wallet.provider] ?? <WalletIcon className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-bold text-foreground">
                {wallet.label}
                {wallet.isPrimary && <span className="rounded-sm border border-rule px-1.5 text-[10px] font-normal uppercase text-tan">Principal</span>}
              </p>
              <p className="truncate text-xs text-tan" title={wallet.address}>
                {WALLET_PROVIDER_LABELS[wallet.provider]} · {shortAddress(wallet.address)}
              </p>
              <p className="truncate text-xs text-tan">Rede {CHAIN_LABELS[wallet.network]}</p>
              {selected && <span className="sr-only">Selecionada</span>}
            </div>
            <Button
              type="button"
              variant={connected ? 'ghost' : 'outline'}
              size="sm"
              data-testid="checkout-wallet-connect"
              isPending={connectingId === wallet.id}
              disabled={disabled && connectingId !== wallet.id}
              className={cn('shrink-0', connected && 'text-success hover:text-success')}
              onClick={(e) => {
                e.stopPropagation()
                onConnect(wallet.id)
              }}
            >
              {connected ? (
                <>
                  <Check aria-hidden="true" />
                  Conectada
                </>
              ) : (
                'Conectar'
              )}
            </Button>
          </div>
        )
      })}
    </div>
  )
}
