import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { AccountLayout } from '@/components/account/account-layout'
import { WalletCard, WalletCardSkeleton, WalletsEmptyState } from '@/components/account/wallet-card'
import { WalletFormDialog } from '@/components/account/wallet-form-dialog'
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
    const [formKey, setFormKey] = useState(0)

    const list = wallets ?? []
    const atLimit = list.length >= 2

    function openCreate() {
      setEditing(null)
      setFormKey((k) => k + 1)
      setDialogOpen(true)
    }

    function openEdit(wallet: Wallet) {
      setEditing(wallet)
      setFormKey((k) => k + 1)
      setDialogOpen(true)
    }

    return (
      <AccountLayout title="Carteiras">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold leading-tight">Carteiras</h1>
            <p className="mt-1 text-sm text-muted-foreground">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
          </div>
          {!atLimit && (
            <button
              type="button"
              onClick={openCreate}
              data-testid="wallet-add"
              className="flex shrink-0 cursor-pointer items-center gap-1.5 text-base font-bold text-accent transition-transform duration-200 hover:translate-x-0.5"
            >
              <Plus className="size-4" aria-hidden="true" />
              Adicionar
            </button>
          )}
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className="space-y-3">
              <WalletCardSkeleton />
              <WalletCardSkeleton />
            </div>
          ) : list.length === 0 ? (
            <WalletsEmptyState onAdd={openCreate} />
          ) : (
            <>
              <ul className="space-y-3">
                {list.map((wallet, index) => (
                  <WalletCard key={wallet.id} wallet={wallet} index={index} onEdit={openEdit} />
                ))}
              </ul>
              {atLimit ? (
                <p className="mt-4 text-sm text-tan">Limite de 2 carteiras atingido (principal e secundária). Edite uma existente para alterar os dados.</p>
              ) : (
                <div className="mt-8">
                  <h2 className="text-lg font-bold">Carteira secundária</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Você ainda não adicionou uma carteira secundária.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* `key` único por abertura força remontagem do formulário: sem isso o
            estado (label/endereço/checkbox principal) vaza entre criar e editar
            e entre aberturas consecutivas (useState inicial não é reexecutado). */}
        <WalletFormDialog
          key={`${editing?.id ?? 'nova'}-${formKey}`}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          wallet={editing}
          existingWallets={list}
        />
      </AccountLayout>
    )
  },
})
