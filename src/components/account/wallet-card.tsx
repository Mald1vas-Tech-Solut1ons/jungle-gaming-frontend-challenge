import type { CSSProperties } from 'react'
import { Link2, Pencil, Wallet as WalletIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useConnectWallet } from '@/hooks/use-account'
import { CHAIN_LABELS, WALLET_PROVIDER_LABELS } from '@/lib/labels'
import type { Wallet } from '@/api/contracts'
import { cn } from '@/lib/utils'
import { truncateAddress } from './validators'

interface WalletCardProps {
  wallet: Wallet
  index: number
  onEdit: (wallet: Wallet) => void
}

/** Carteira cadastrada: papel (principal/secundária), dados e ações. */
export function WalletCard({ wallet, index, onEdit }: WalletCardProps) {
  const connect = useConnectWallet()
  return (
    <li
      data-testid="wallet-card"
      className={cn('stagger flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 sm:flex-nowrap', wallet.isPrimary ? 'border-primary' : 'border-transparent')}
      style={{ '--i': index } as CSSProperties}
    >
      <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full border border-rule bg-tile text-accent">
        <WalletIcon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="break-words text-base font-bold">{wallet.label}</span>
          <span
            className={cn(
              'rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase',
              wallet.isPrimary ? 'bg-primary text-primary-foreground' : 'border border-rule text-tan',
            )}
          >
            {wallet.isPrimary ? 'Principal' : 'Secundária'}
          </span>
        </p>
        <p className="mt-1 truncate text-sm text-muted-foreground" title={wallet.address}>
          {truncateAddress(wallet.address)}
        </p>
        <p className="text-sm text-tan">
          {WALLET_PROVIDER_LABELS[wallet.provider]} · Rede {CHAIN_LABELS[wallet.network]}
        </p>
      </div>
      <div className="flex w-full gap-2 sm:w-auto">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 sm:flex-none"
          isPending={connect.isPending}
          onClick={() => connect.mutate(wallet.id, { onSuccess: () => toast.success('Carteira conectada (simulada).') })}
          data-testid="wallet-connect"
        >
          {!connect.isPending && <Link2 aria-hidden="true" />}
          Conectar
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(wallet)} data-testid="wallet-edit" aria-label={`Editar ${wallet.label}`}>
          <Pencil aria-hidden="true" />
          Editar
        </Button>
      </div>
    </li>
  )
}

/** Estado vazio da página de carteiras, com chamada para ação. */
export function WalletsEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex animate-rise flex-col items-center gap-3 rounded-xl border border-dashed border-rule px-6 py-12 text-center">
      <span className="flex size-16 animate-float items-center justify-center rounded-full bg-tile text-accent">
        <WalletIcon className="size-7" aria-hidden="true" />
      </span>
      <h3 className="text-lg font-bold">Nenhuma carteira cadastrada</h3>
      <p className="max-w-sm text-sm text-muted-foreground">Cadastre uma carteira para receber seus NFTs e pagar no checkout.</p>
      <Button onClick={onAdd} className="mt-2">
        Cadastrar primeira carteira
      </Button>
    </div>
  )
}

/** Placeholder de carregamento enquanto a lista de carteiras é buscada. */
export function WalletCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-card p-4" aria-hidden="true">
      <Skeleton className="size-11 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      <Skeleton className="h-8 w-40" />
    </div>
  )
}
