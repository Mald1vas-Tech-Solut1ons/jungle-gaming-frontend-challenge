import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import type { Chain } from '@/api/contracts'
import { useConnectWallet, useWallets } from '@/hooks/use-account'
import { useCart } from '@/hooks/use-cart'
import { useCreateOrder, useQuote } from '@/hooks/use-order'
import { CollectorForm, type CollectorFormValues } from './collector-form'
import { NetworkSelector } from './network-selector'
import { QuoteSummary } from './quote-summary'
import { WalletPicker } from './wallet-picker'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Validação client-side espelhando as regras da API (mesmas mensagens). */
function validateCollector(values: CollectorFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (values.fullName.trim().length < 3) errors.fullName = 'Informe o nome completo.'
  if (!EMAIL_RE.test(values.email.trim())) errors.email = 'Informe um e-mail válido.'
  if (!values.country) errors.country = 'Selecione o país.'
  return errors
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const { data: cart, isLoading: cartLoading } = useCart()
  const { data: wallets, isLoading: walletsLoading } = useWallets()
  const connectWallet = useConnectWallet()
  const { quote, setQuote, requestQuote, isPending: quotePending, error: quoteError } = useQuote()
  const { state, submit, recover, reset } = useCreateOrder()

  const [network, setNetwork] = useState<Chain>('ethereum')
  const [walletId, setWalletId] = useState<string | null>(null)
  const [collector, setCollector] = useState<CollectorFormValues>({ fullName: '', email: '', country: '', document: '' })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [confirmChanges, setConfirmChanges] = useState(false)

  const items = cart?.items ?? []

  const cartFingerprint = useMemo(
    () =>
      cart
        ? JSON.stringify([cart.couponCode ?? null, ...cart.items.map((i) => [i.nftId, i.editionId, i.quantity, i.unitPrice, i.available])])
        : null,
    [cart],
  )

  const requestQuoteRef = useRef(requestQuote)
  useEffect(() => {
    requestQuoteRef.current = requestQuote
  })

  // Cotação: (re)solicita quando o conteúdo do carrinho ou a rede mudam.
  const lastQuoteKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (!cartFingerprint || items.length === 0) return
    const key = `${cartFingerprint}:${network}`
    if (lastQuoteKeyRef.current === key) return
    lastQuoteKeyRef.current = key
    requestQuoteRef.current(network)
  }, [cartFingerprint, items.length, network])

  // 409 (QUOTE_CHANGED / AVAILABILITY_CONFLICT / COUPON_EXPIRED): exibe a
  // cotação nova enviada pelo servidor e reexige confirmação explícita.
  // Padrão "ajustar estado durante o render" (sem efeitos em cascata).
  const conflictQuote = state.kind === 'conflict' ? state.quote : undefined
  const conflictKey = state.kind === 'conflict' ? `${state.message}|${conflictQuote?.fingerprint ?? 'sem-cotacao'}` : null
  const [handledConflictKey, setHandledConflictKey] = useState<string | null>(null)
  if (conflictKey === null && handledConflictKey !== null) {
    setHandledConflictKey(null)
  }
  if (conflictKey !== null && conflictKey !== handledConflictKey) {
    setHandledConflictKey(conflictKey)
    setConfirmChanges(false)
    if (conflictQuote) setQuote(conflictQuote)
  }

  // Pedido criado → vai para a página de confirmação.
  const doneOrder = state.kind === 'done' ? state.order : undefined
  useEffect(() => {
    if (!doneOrder) return
    void navigate({ to: '/orders/$orderId', params: { orderId: doneOrder.id } })
  }, [doneOrder, navigate])

  // Carteira selecionada (estado explícito) com fallback para a principal.
  const selectedWalletId = useMemo(() => {
    const list = wallets ?? []
    if (walletId && list.some((w) => w.id === walletId)) return walletId
    return list.length > 0 ? (list.find((w) => w.isPrimary) ?? list[0]).id : walletId
  }, [wallets, walletId])

  const submitting = state.kind === 'submitting'
  const pendingRecovery = state.kind === 'pending-recovery'
  const connectingWalletId = connectWallet.isPending ? connectWallet.variables : null

  const handleConnect = (id: string) => {
    connectWallet.mutate(id, { onSuccess: () => setWalletId(id) })
  }

  const collectorPayload = {
    fullName: collector.fullName.trim(),
    email: collector.email.trim(),
    country: collector.country,
    ...(collector.document.trim() ? { document: collector.document.trim() } : {}),
  }

  const handleSubmitOrder = () => {
    if (submitting || pendingRecovery) return

    if (state.kind === 'conflict') {
      // Reenvio após conflito: confirmação explícita, cotação nova e nova
      // chave de idempotência (nunca reutiliza uma tentativa divergente).
      if (!confirmChanges || !quote || !selectedWalletId) return
      requestQuoteRef.current(network)
      reset()
      void submit({ quoteFingerprint: quote.fingerprint, walletId: selectedWalletId, network, collector: collectorPayload })
      return
    }

    const errors = validateCollector(collector)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0 || !quote || !selectedWalletId) return
    void submit({ quoteFingerprint: quote.fingerprint, walletId: selectedWalletId, network, collector: collectorPayload })
  }

  const submitDisabled = !quote || !selectedWalletId || submitting || pendingRecovery || (state.kind === 'conflict' && !confirmChanges)

  if (cartLoading && !cart) return <CheckoutSkeleton />

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header>
        <h1 className="display-title text-foreground">Pagamento</h1>
        <p className="mt-2 text-sm text-muted-foreground">Revise os dados do colecionador, a carteira e a rede antes de confirmar.</p>
      </header>

      {cart && items.length === 0 && !pendingRecovery ? (
        <Alert variant="info">
          <AlertTitle>Seu carrinho está vazio</AlertTitle>
          <AlertDescription>
            Adicione itens ao carrinho antes de finalizar a compra.{' '}
            <Button asChild variant="link" className="h-auto p-0 align-baseline">
              <Link to="/" search={{}}>Explorar NFTs</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : cart && items.length === 0 && pendingRecovery ? (
        <RecoveryAlert submitting={submitting} onRecover={() => void recover()} />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            {quoteError && (
              <Alert variant="destructive">
                <AlertTitle>Não foi possível calcular a cotação</AlertTitle>
                <AlertDescription>{quoteError.message}</AlertDescription>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => requestQuoteRef.current(network)}>
                  Tentar novamente
                </Button>
              </Alert>
            )}

            {pendingRecovery && (
              <RecoveryAlert submitting={submitting} onRecover={() => void recover()} />
            )}

            {state.kind === 'conflict' && (
              <Alert variant="destructive">
                <AlertTitle>Os valores do pedido mudaram</AlertTitle>
                <AlertDescription>{state.message}</AlertDescription>
                <div className="mt-3 flex items-start gap-2">
                  <Checkbox
                    id="confirm-changes"
                    data-testid="confirm-changes"
                    checked={confirmChanges}
                    disabled={submitting || !quote}
                    onCheckedChange={(checked) => setConfirmChanges(checked === true)}
                  />
                  <Label htmlFor="confirm-changes" className="cursor-pointer text-xs font-normal leading-snug text-foreground">
                    Entendi: os valores foram atualizados e quero revisar a nova cotação antes de reenviar o pedido.
                  </Label>
                </div>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle>1. Dados do colecionador</CardTitle>
                <CardDescription>Estes dados aparecerão no recibo do pedido.</CardDescription>
              </CardHeader>
              <CardContent>
                <CollectorForm
                  values={collector}
                  errors={fieldErrors}
                  disabled={submitting}
                  onChange={(field, value) => {
                    setCollector((prev) => ({ ...prev, [field]: value }))
                    if (fieldErrors[field]) {
                      setFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next[field]
                        return next
                      })
                    }
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Carteira</CardTitle>
                <CardDescription>Selecione a carteira que pagará o pedido.</CardDescription>
              </CardHeader>
              <CardContent>
                <WalletPicker
                  wallets={wallets}
                  isLoading={walletsLoading}
                  selectedId={selectedWalletId}
                  connectingId={connectingWalletId}
                  disabled={submitting}
                  onSelect={setWalletId}
                  onConnect={handleConnect}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Rede</CardTitle>
                <CardDescription>A taxa de rede é calculada pela blockchain escolhida.</CardDescription>
              </CardHeader>
              <CardContent>
                <NetworkSelector value={network} disabled={submitting} onChange={setNetwork} />
              </CardContent>
            </Card>
          </div>

          <aside className="lg:sticky lg:top-20">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Seus NFTs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <QuoteSummary quote={quote} isPending={quotePending} />
                <Button size="lg" className="w-full" data-testid="submit-order" isPending={submitting} disabled={submitDisabled} onClick={handleSubmitOrder}>
                  Confirmar compra
                </Button>
                {state.kind === 'conflict' && !confirmChanges && (
                  <p className="text-center text-xs text-muted-foreground">Marque a confirmação acima para reenviar.</p>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </div>
  )
}

function RecoveryAlert({ submitting, onRecover }: { submitting: boolean; onRecover: () => void }) {
  return (
    <Alert variant="info">
      <AlertTitle>O servidor demorou para responder</AlertTitle>
      <AlertDescription>
        Seu pedido pode ter sido criado. Verifique o status antes de tentar novamente — a mesma tentativa será retomada.
        <Button variant="outline" size="sm" className="mt-3 w-full" data-testid="recover-order" isPending={submitting} onClick={onRecover}>
          Verificar status
        </Button>
      </AlertDescription>
    </Alert>
  )
}

function CheckoutSkeleton() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]" aria-label="Carregando pagamento">
      <div className="space-y-6">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  )
}
