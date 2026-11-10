import { Link2, Pencil, Wallet as WalletIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useConnectWallet } from '@/hooks/use-account'
import { CHAIN_LABELS, WALLET_PROVIDER_LABELS } from '@/lib/labels'
import type { Wallet } from '@/api/contracts'
import { truncateAddress } from './validators'

interface WalletCardProps {
  wallet: Wallet
  onEdit: (wallet: Wallet) => void
}

/** Cartão de carteira: dados principais + ações de conexão e edição. */
export function WalletCard({ wallet, onEdit }: WalletCardProps) {
  const connect = useConnectWallet()
  return (
    <Card data-testid="wallet-card" className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <WalletIcon className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <CardTitle className="break-words text-base">{wallet.label}</CardTitle>
          </div>
          {wallet.isPrimary ? (
            <Badge variant="success" className="shrink-0">
              Principal
            </Badge>
          ) : (
            <Badge variant="secondary" className="shrink-0">
              Secundária
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-1.5 text-sm">
        <p className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Provedor</span>
          <span className="text-right">{WALLET_PROVIDER_LABELS[wallet.provider]}</span>
        </p>
        <p className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Rede</span>
          <span className="text-right">{CHAIN_LABELS[wallet.network]}</span>
        </p>
        <p className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Endereço</span>
          <span className="truncate text-right" title={wallet.address}>
            {truncateAddress(wallet.address)}
          </span>
        </p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          isPending={connect.isPending}
          onClick={() =>
            connect.mutate(wallet.id, {
              onSuccess: () => toast.success('Carteira conectada (simulada)'),
            })
          }
          data-testid="wallet-connect"
        >
          <Link2 aria-hidden="true" />
          Conectar
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(wallet)} data-testid="wallet-edit">
          <Pencil aria-hidden="true" />
          Editar
        </Button>
      </CardFooter>
    </Card>
  )
}

/** Estado vazio da página de carteiras, com chamada para ação. */
export function WalletsEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <WalletIcon className="size-8 text-muted-foreground" aria-hidden="true" />
        <CardTitle>Nenhuma carteira cadastrada</CardTitle>
        <CardDescription>Cadastre uma carteira para receber seus NFTs no checkout.</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center pb-6">
        <Button onClick={onAdd}>Cadastrar primeira carteira</Button>
      </CardContent>
    </Card>
  )
}

/** Placeholder de carregamento enquanto a lista de carteiras é buscada. */
export function WalletCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-2/3" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
      <CardContent className="flex gap-2 pt-0">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-20" />
      </CardContent>
    </Card>
  )
}
