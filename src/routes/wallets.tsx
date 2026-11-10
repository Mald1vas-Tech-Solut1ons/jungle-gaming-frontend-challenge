import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { PageHeader } from '@/components/account/page-header'
import { WalletCard, WalletCardSkeleton, WalletsEmptyState } from '@/components/account/wallet-card'
import { WalletFormDialog } from '@/components/account/wallet-form-dialog'
import { Button } from '@/components/ui/button'
import { useWallets } from '@/hooks/use-account'
import { getToken } from '@/lib/session'
import type { Wallet } from '@/api/contracts'

export const Route = createFileRoute('/wallets')({
  beforeLoad: ({ location }) => {
    if (!getToken()) {
      const search = { redirect: location.href }
      throw redirect({ to: '/login', search })
    }
  },
  component: function WalletsPage() {
    const { data: wallets, isLoading } = useWallets()
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editing, setEditing] = useState<Wallet | null>(null)

    const list = wallets ?? []
    const atLimit = list.length >= 2

    function openCreate() {
      setEditing(null)
      setDialogOpen(true)
    }

    function openEdit(wallet: Wallet) {
      setEditing(wallet)
      setDialogOpen(true)
    }

    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeader title="Carteiras" description="Gerencie as carteiras usadas para receber seus NFTs." />
          <Button onClick={openCreate} data-testid="wallet-add">
            Nova carteira
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <WalletCardSkeleton />
            <WalletCardSkeleton />
          </div>
        ) : list.length === 0 ? (
          <WalletsEmptyState onAdd={openCreate} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {list.map((wallet) => (
                <WalletCard key={wallet.id} wallet={wallet} onEdit={openEdit} />
              ))}
            </div>
            {atLimit ? (
              <p className="text-center text-xs text-muted-foreground">
                Limite de 2 carteiras atingido. Edite uma existente para alterar os dados.
              </p>
            ) : null}
          </>
        )}

        <WalletFormDialog open={dialogOpen} onOpenChange={setDialogOpen} wallet={editing} existingWallets={list} />
      </div>
    )
  },
})
