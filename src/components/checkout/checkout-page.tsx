import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { MobileTopBar } from '@/components/layout/mobile-top-bar'
import type { Chain } from '@/api/contracts'
import { useConnectWallet, useWallets } from '@/hooks/use-account'
import { useCart } from '@/hooks/use-cart'
import { useIsMobile } from '@/hooks/use-media-query'
import { useCreateOrder, useQuote } from '@/hooks/use-order'
import { formatEth } from '@/lib/money'
import { CheckoutBreadcrumb } from './checkout-breadcrumb'
import { CollectorForm, type CollectorFormValues } from './collector-form'
import { QuoteSummary } from './quote-summary'
import { WalletPicker } from './wallet-picker'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const USERNAME_RE = /^[a-z0-9._]{3,30}$/

/** Validação client-side espelhando as regras da API (mesmas mensagens). */
function validateCollector(values: CollectorFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (values.fullName.trim().length < 3) errors.fullName = 'Informe o nome completo.'
  if (!USERNAME_RE.test(values.username.trim()))
    errors.username = 'Informe um nome de usuário (3 a 30 caracteres: letras minúsculas, números, ponto ou sublinhado).'
  if (!EMAIL_RE.test(values.email.trim())) errors.email = 'Informe um e-mail válido.'
  if (values.note.length > 280) errors.note = 'A observação aceita até 280 caracteres.'
  return errors
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { data: cart, isLoading: cartLoading } = useCart()
  const { data: wallets, isLoading: walletsLoading } = useWallets()
  const connectWallet = useConnectWallet()
  const { quote, setQuote, requestQuote, isPending: quotePending, error: quoteError } = useQuote()
  const { state, submit, recover, reset } = useCreateOrder()

  const [network, setNetwork] = useState<Chain>('ethereum')
  const [walletId, setWalletId] = useState<string | null>(null)
  const [connectedIds, setConnectedIds] = useState<string[]>([])
  const [collector, setCollector] = useState<CollectorFormValues>({ fullName: '', username: '', email: '', note: '' })
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
    connectWallet.mutate(id, {
      onSuccess: () => {
        setWalletId(id)
        setConnectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
      },
      onError: () => setConnectedIds((prev) => prev.filter((value) => value !== id)),
    })
  }

  const collectorPayload = {
    fullName: collector.fullName.trim(),
    username: collector.username.trim(),
    email: collector.email.trim(),
    ...(collector.note.trim() ? { note: collector.note.trim() } : {}),
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
    if (Object.keys(errors).length > 0) {
      // Leva o foco ao primeiro campo inválido (teclado e leitor de tela)
      const first = Object.keys(errors)[0]
      document.getElementById(`checkout-${first}`)?.focus()
      return
    }
    if (!quote || !selectedWalletId) return
    void submit({ quoteFingerprint: quote.fingerprint, walletId: selectedWalletId, network, collector: collectorPayload })
  }

  const submitDisabled = !quote || !selectedWalletId || submitting || pendingRecovery || (state.kind === 'conflict' && !confirmChanges)

  if (cartLoading && !cart) return <CheckoutSkeleton />

  const header = isMobile ? <MobileTopBar title="Pagamento com carteira" fallback="/cart" /> : <CheckoutBreadcrumb current="Pagamento" />

  if (cart && items.length === 0) {
    return (
      <div>
        {header}
        {pendingRecovery ? (
          <RecoveryAlert submitting={submitting} onRecover={() => void recover()} />
        ) : (
          <div className="flex animate-rise flex-col items-center gap-4 bg-card px-6 py-16 text-center">
            <h1 className="text-xl font-bold">Seu carrinho está vazio</h1>
            <p className="text-sm text-muted-foreground">Adicione itens ao carrinho antes de finalizar a compra.</p>
            <Button asChild>
              <Link to="/" search={{}}>
                Explorar NFTs
              </Link>
            </Button>
          </div>
        )}
      </div>
    )
  }

  const alerts = (
    <>
      {quoteError && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível calcular a cotação</AlertTitle>
          <AlertDescription>{quoteError.message}</AlertDescription>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => requestQuoteRef.current(network)}>
            Tentar novamente
          </Button>
        </Alert>
      )}
      {pendingRecovery && <RecoveryAlert submitting={submitting} onRecover={() => void recover()} />}
      {state.kind === 'conflict' && (
        <Alert variant="destructive" className="animate-rise">
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
            <Label htmlFor="confirm-changes" className="cursor-pointer text-xs leading-snug">
              Entendi: os valores foram atualizados e quero revisar a nova cotação antes de reenviar o pedido.
            </Label>
          </div>
        </Alert>
      )}
    </>
  )

  const form = (
    <CollectorForm
      values={collector}
      errors={fieldErrors}
      disabled={submitting}
      network={network}
      onNetworkChange={setNetwork}
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
  )

  const walletPicker = (
    <WalletPicker
      wallets={wallets}
      isLoading={walletsLoading}
      selectedId={selectedWalletId}
      connectingId={connectingWalletId}
      connectedIds={connectedIds}
      disabled={submitting}
      onSelect={setWalletId}
      onConnect={handleConnect}
    />
  )

  const conflictHint = state.kind === 'conflict' && !confirmChanges && (
    <p className="text-center text-xs text-muted-foreground">Marque a confirmação acima para reenviar.</p>
  )

  // ------------------------------- Mobile -------------------------------
  if (isMobile) {
    return (
      <div className="pb-32">
        {header}
        <div className="space-y-6">
          {alerts}
          <section aria-labelledby="mobile-wallets-title">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="mobile-wallets-title" className="text-base font-bold">
                Carteira e rede
              </h2>
              <Link to="/wallets" className="text-sm font-bold text-accent">
                Trocar carteira
              </Link>
            </div>
            {walletPicker}
          </section>
          <section aria-labelledby="mobile-collector-title">
            <h2 id="mobile-collector-title" className="mb-4 text-base font-bold">
              Perfil do colecionador
            </h2>
            {form}
          </section>
          <section aria-label="Resumo do pedido" className="rounded-[22px] bg-card p-5">
            <QuoteSummary quote={quote} isPending={quotePending} showLines={false} />
          </section>
        </div>
        <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6">
          {quote && (
            <p className="mb-3 flex items-center justify-end gap-3 text-base font-bold">
              Total: <span className="text-xl text-accent">{formatEth(quote.total)}</span>
            </p>
          )}
          <Button
            variant="pill"
            size="pill"
            className="w-full"
            data-testid="submit-order"
            isPending={submitting}
            disabled={submitDisabled}
            onClick={handleSubmitOrder}
          >
            Confirmar compra
          </Button>
          {conflictHint}
        </div>
      </div>
    )
  }

  // ------------------------------ Desktop -------------------------------
  return (
    <div>
      {header}
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,405px)] lg:gap-8">
        <div className="space-y-6">
          {alerts}
          <section aria-labelledby="collector-title" className="animate-rise">
            <h1 id="collector-title" className="mb-5 text-lg font-bold">
              Perfil do colecionador
            </h1>
            {form}
          </section>
        </div>

        <aside aria-label="Resumo e pagamento" className="flex animate-rise flex-col gap-6 [animation-delay:90ms] lg:sticky lg:top-24">
          <section aria-labelledby="summary-title">
            <h2 id="summary-title" className="mb-3 text-lg font-bold">
              Seus NFTs
            </h2>
            <QuoteSummary quote={quote} isPending={quotePending} />
          </section>
          <section aria-labelledby="wallets-title">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="wallets-title" className="text-lg font-bold">
                Carteira e rede
              </h2>
              <Link to="/wallets" className="text-sm font-bold text-accent hover:underline">
                Gerenciar
              </Link>
            </div>
            {walletPicker}
          </section>
          <Button size="lg" className="h-[45px] w-full text-base" data-testid="submit-order" isPending={submitting} disabled={submitDisabled} onClick={handleSubmitOrder}>
            Confirmar compra
          </Button>
          {conflictHint}
        </aside>
      </div>
    </div>
  )
}

function RecoveryAlert({ submitting, onRecover }: { submitting: boolean; onRecover: () => void }) {
  return (
    <Alert variant="info" className="animate-rise">
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
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_405px]" aria-label="Carregando pagamento">
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-[70px] w-full" />
        <Skeleton className="h-[70px] w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  )
}
