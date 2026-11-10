import { Link } from '@tanstack/react-router'
import { Wallet as WalletIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Wallet } from '@/api/contracts'
import { CHAIN_LABELS, WALLET_PROVIDER_LABELS } from '@/lib/labels'
import { cn } from '@/lib/utils'

interface WalletPickerProps {
  wallets: Wallet[] | undefined
  isLoading: boolean
  selectedId: string | null
  connectingId: string | null
  disabled: boolean
  onSelect: (id: string) => void
  onConnect: (id: string) => void
}

/** Seleção de carteira: cards clicáveis + botão de conexão simulada. */
export function WalletPicker({ wallets, isLoading, selectedId, connectingId, disabled, onSelect, onConnect }: WalletPickerProps) {
  if (isLoading && !wallets) {
    return (
      <div className="space-y-2" aria-label="Carregando carteiras">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (!wallets || wallets.length === 0) {
    return (
      <Alert variant="info">
        <AlertTitle>Nenhuma carteira cadastrada</AlertTitle>
        <AlertDescription>
          Cadastre uma carteira para concluir o pagamento.{' '}
          <Button asChild variant="link" className="h-auto p-0 align-baseline">
            <Link to="/wallets">Ir para carteiras</Link>
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div role="radiogroup" aria-label="Carteira para pagamento" className="space-y-2">
      {wallets.map((wallet) => {
        const selected = wallet.id === selectedId
        return (
          <div
            key={wallet.id}
            role="radio"
            aria-checked={selected}
            tabIndex={0}
            data-testid="checkout-wallet"
            onClick={() => !disabled && onSelect(wallet.id)}
            onKeyDown={(e) => {
              if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                onSelect(wallet.id)
              }
            }}
            className={cn(
              'flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-lg border p-4 transition-colors',
              selected ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-surface',
              disabled && 'pointer-events-none opacity-60',
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-md border',
                  selected ? 'border-primary text-primary' : 'border-border text-muted-foreground',
                )}
              >
                <WalletIcon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">{wallet.label}</span>
                  {wallet.isPrimary && <Badge variant="outline">Principal</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {WALLET_PROVIDER_LABELS[wallet.provider]} · {CHAIN_LABELS[wallet.network]}
                </p>
                <p className="max-w-[16rem] truncate font-mono text-[10px] text-muted-foreground/70">{wallet.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selected && <Badge variant="success">Selecionada</Badge>}
              <Button
                type="button"
                variant={selected ? 'default' : 'outline'}
                size="sm"
                data-testid="checkout-wallet-connect"
                isPending={connectingId === wallet.id}
                disabled={disabled && connectingId !== wallet.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onConnect(wallet.id)
                }}
              >
                Conectar
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
