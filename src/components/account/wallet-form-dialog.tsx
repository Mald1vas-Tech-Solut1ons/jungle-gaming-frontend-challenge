import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateWallet, useUpdateWallet } from '@/hooks/use-account'
import { normalizeError } from '@/lib/api'
import { CHAIN_LABELS, WALLET_PROVIDER_LABELS } from '@/lib/labels'
import type { Chain, UpsertWalletRequest, Wallet, WalletProvider } from '@/api/contracts'
import { FieldError } from './field-error'
import { ETH_ADDRESS_RE, type FieldErrors } from './validators'

const PROVIDERS: WalletProvider[] = ['metamask', 'coinbase', 'walletconnect', 'phantom']
const NETWORKS: Chain[] = ['ethereum', 'polygon', 'solana']

interface WalletFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Carteira em edição; `null` cria uma nova. */
  wallet: Wallet | null
  /** Carteiras atuais do colecionador (usadas nas regras de principal). */
  existingWallets: Wallet[]
}

/**
 * Diálogo de criação/edição de carteira. O conteúdo é desmontado ao fechar
 * (Radix Dialog), então o estado inicial é capturado a cada abertura.
 */
export function WalletFormDialog({ open, onOpenChange, wallet, existingWallets }: WalletFormDialogProps) {
  const createWallet = useCreateWallet()
  const updateWallet = useUpdateWallet()
  const [label, setLabel] = useState(wallet?.label ?? '')
  const [provider, setProvider] = useState<WalletProvider | undefined>(wallet?.provider)
  const [address, setAddress] = useState(wallet?.address ?? '')
  const [network, setNetwork] = useState<Chain | undefined>(wallet?.network)
  const [isPrimary, setIsPrimary] = useState(wallet ? wallet.isPrimary : existingWallets.length === 0)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const singlePrimary = wallet !== null && wallet.isPrimary && existingWallets.length === 1

  function clearError(field: string) {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function handleApiError(error: unknown) {
    const apiError = normalizeError(error)
    if (apiError.fields) setFieldErrors(apiError.fields)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: FieldErrors = {}
    if (label.trim().length < 2) errors.label = 'Informe um nome para a carteira (mín. 2 caracteres).'
    if (!provider) errors.provider = 'Selecione um provedor.'
    if (!network) errors.network = 'Selecione uma rede.'
    if (!ETH_ADDRESS_RE.test(address.trim())) errors.address = 'Endereço inválido (0x + 40 caracteres hexadecimais).'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    const selectedProvider = provider
    const selectedNetwork = network
    if (!selectedProvider || !selectedNetwork) return
    const payload: UpsertWalletRequest = {
      label: label.trim(),
      provider: selectedProvider,
      address: address.trim(),
      network: selectedNetwork,
      isPrimary,
    }
    if (wallet) {
      updateWallet.mutate(
        { id: wallet.id, payload },
        { onSuccess: () => onOpenChange(false), onError: handleApiError },
      )
    } else {
      createWallet.mutate(payload, { onSuccess: () => onOpenChange(false), onError: handleApiError })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{wallet ? 'Editar carteira' : 'Nova carteira'}</DialogTitle>
          <DialogDescription>
            {wallet
              ? 'Atualize os dados da carteira vinculada à sua conta.'
              : 'Cadastre uma carteira para receber seus NFTs no checkout.'}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="wallet-label">Nome da carteira</Label>
            <Input
              id="wallet-label"
              data-testid="wallet-label"
              type="text"
              placeholder="Ex.: MetaMask principal"
              value={label}
              onChange={(event) => {
                setLabel(event.target.value)
                clearError('label')
              }}
              aria-invalid={fieldErrors.label ? true : undefined}
              aria-describedby={fieldErrors.label ? 'wallet-label-error' : undefined}
            />
            <FieldError id="wallet-label-error">{fieldErrors.label}</FieldError>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wallet-provider">Provedor</Label>
            <Select
              value={provider}
              onValueChange={(value) => {
                setProvider(value as WalletProvider)
                clearError('provider')
              }}
            >
              <SelectTrigger
                id="wallet-provider"
                data-testid="wallet-provider"
                aria-invalid={fieldErrors.provider ? true : undefined}
                aria-describedby={fieldErrors.provider ? 'wallet-provider-error' : undefined}
              >
                <SelectValue placeholder="Selecione um provedor" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {WALLET_PROVIDER_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="wallet-provider-error">{fieldErrors.provider}</FieldError>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wallet-address">Endereço</Label>
            <Input
              id="wallet-address"
              data-testid="wallet-address"
              type="text"
              spellCheck={false}
              autoComplete="off"
              placeholder="0x…"
              value={address}
              onChange={(event) => {
                setAddress(event.target.value)
                clearError('address')
              }}
              aria-invalid={fieldErrors.address ? true : undefined}
              aria-describedby={fieldErrors.address ? 'wallet-address-error' : undefined}
            />
            <FieldError id="wallet-address-error">{fieldErrors.address}</FieldError>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wallet-network">Rede</Label>
            <Select
              value={network}
              onValueChange={(value) => {
                setNetwork(value as Chain)
                clearError('network')
              }}
            >
              <SelectTrigger
                id="wallet-network"
                data-testid="wallet-network"
                aria-invalid={fieldErrors.network ? true : undefined}
                aria-describedby={fieldErrors.network ? 'wallet-network-error' : undefined}
              >
                <SelectValue placeholder="Selecione uma rede" />
              </SelectTrigger>
              <SelectContent>
                {NETWORKS.map((n) => (
                  <SelectItem key={n} value={n}>
                    {CHAIN_LABELS[n]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="wallet-network-error">{fieldErrors.network}</FieldError>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="wallet-primary"
                data-testid="wallet-primary"
                checked={isPrimary}
                onCheckedChange={(checked) => setIsPrimary(checked === true)}
                disabled={singlePrimary}
              />
              <Label htmlFor="wallet-primary" className="font-normal">
                Definir como carteira principal
              </Label>
            </div>
            <FieldError id="wallet-primary-error">{fieldErrors.isPrimary}</FieldError>
            <p className="text-xs text-muted-foreground">
              {singlePrimary
                ? 'É preciso manter uma carteira principal. Cadastre uma secundária para trocar.'
                : 'A carteira principal é usada por padrão no checkout.'}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              isPending={createWallet.isPending || updateWallet.isPending}
              data-testid="wallet-save"
            >
              {wallet ? 'Salvar alterações' : 'Cadastrar carteira'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
