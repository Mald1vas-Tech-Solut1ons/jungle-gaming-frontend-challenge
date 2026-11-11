import { useEffect, useMemo, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { CheckoutBreadcrumb } from '@/components/checkout/checkout-breadcrumb'
import { MobileTopBar } from '@/components/layout/mobile-top-bar'
import { NftRail } from '@/components/nft/nft-rail'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useApplyCoupon, useCart, useRemoveCartItem, useRemoveCoupon, useUpdateCartItem } from '@/hooks/use-cart'
import { useIsMobile } from '@/hooks/use-media-query'
import { useQuote } from '@/hooks/use-order'
import { normalizeError } from '@/lib/api'
import { CartCouponForm } from './cart-coupon-form'
import { CartEmptyState } from './cart-empty-state'
import { CartItemCard } from './cart-item-card'
import { CartTotals, CheckoutCta } from './cart-summary'

export function CartPage() {
  const isMobile = useIsMobile()
  const { data: cart, isLoading, error, refetch } = useCart()
  const { quote, requestQuote } = useQuote()
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()
  const applyCoupon = useApplyCoupon()
  const removeCoupon = useRemoveCoupon()

  const items = cart?.items ?? []

  // Impressão do conteúdo do carrinho: qualquer mudança de quantidade, cupom,
  // preço ou disponibilidade (mutation ou evento `nft.updated` em tempo real)
  // gera uma nova cotação — os totais exibidos vêm sempre da API.
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

  const lastQuoteKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (!cartFingerprint || items.length === 0) return
    if (lastQuoteKeyRef.current === cartFingerprint) return
    lastQuoteKeyRef.current = cartFingerprint
    requestQuoteRef.current('ethereum')
  }, [cartFingerprint, items.length])

  const updatingItemId = updateItem.isPending ? updateItem.variables?.itemId : null
  const removingItemId = removeItem.isPending ? removeItem.variables : null
  const blocked = items.some((item) => item.available === 0 || item.quantity > item.available)

  const header = isMobile ? <MobileTopBar title="Carrinho de NFTs" /> : <CheckoutBreadcrumb current="Carrinho" />

  if (isLoading && !cart) {
    return (
      <div>
        {header}
        <CartPageSkeleton mobile={isMobile} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        {header}
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar o carrinho</AlertTitle>
          <AlertDescription>{normalizeError(error).message}</AlertDescription>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </Alert>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div>
        {header}
        <CartEmptyState />
        {!isMobile && <NftRail title="Colecionadores também viram" params={{ sort: 'popular' }} />}
      </div>
    )
  }

  const coupon = (variant: 'bar' | 'pill') => (
    <CartCouponForm
      variant={variant}
      couponCode={cart?.couponCode ?? null}
      percentOff={quote?.coupon?.percentOff ?? null}
      applyPending={applyCoupon.isPending}
      removePending={removeCoupon.isPending}
      onApply={(code) => applyCoupon.mutate(code)}
      onRemove={() => removeCoupon.mutate()}
    />
  )

  const blockedHint = blocked && (
    <p className="text-center text-xs text-destructive" role="status">
      Ajuste os itens indisponíveis para finalizar.
    </p>
  )

  const list = (layout: 'row' | 'card') => (
    <ul className={layout === 'row' ? 'space-y-3' : 'space-y-4'} aria-label="Itens do carrinho">
      {items.map((item, index) => (
        <CartItemCard
          key={item.id}
          item={item}
          index={index}
          layout={layout}
          pending={updatingItemId === item.id || removingItemId === item.id}
          onChangeQuantity={(quantity) => updateItem.mutate({ itemId: item.id, quantity })}
          onRemove={() => removeItem.mutate(item.id)}
        />
      ))}
    </ul>
  )

  // ------------------------------- Mobile -------------------------------
  if (isMobile) {
    return (
      <div>
        {header}
        {list('card')}
        <section aria-label="Resumo do pedido" className="-mx-4 mt-6 animate-rise rounded-t-[28px] bg-card px-6 pb-8 pt-6">
          {coupon('pill')}
          <div className="mt-5">
            <CartTotals quote={quote} />
          </div>
          <div className="mt-6 space-y-2">
            <CheckoutCta disabled={blocked} pill />
            {blockedHint}
          </div>
        </section>
      </div>
    )
  }

  // ------------------------------ Desktop -------------------------------
  return (
    <div>
      {header}
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_332px] lg:gap-[86px]">
        <section aria-labelledby="cart-title">
          <h1 id="cart-title" className="sr-only">
            Carrinho de NFTs
          </h1>
          <div className="mb-3 grid grid-cols-[minmax(0,1fr)_110px_110px_130px_40px] gap-3 border-b border-rule pb-3 text-base font-bold" aria-hidden="true">
            <span>NFTs</span>
            <span>Preço</span>
            <span>Edições</span>
            <span>Total</span>
            <span />
          </div>
          {list('row')}
        </section>

        <aside aria-labelledby="summary-title" className="animate-rise lg:sticky lg:top-24">
          <h2 id="summary-title" className="border-b border-rule pb-3 text-lg font-bold">
            Resumo da carteira
          </h2>
          <p className="mb-2 mt-6 text-sm font-bold">Código promocional</p>
          {coupon('bar')}
          <div className="mt-6">
            <CartTotals quote={quote} />
          </div>
          <div className="mt-6 space-y-2">
            <CheckoutCta disabled={blocked} />
            {blockedHint}
          </div>
          <Link to="/" search={{}} className="mt-4 block text-center text-base text-accent transition-colors duration-200 hover:text-foreground">
            Continuar explorando
          </Link>
        </aside>
      </div>

      <NftRail title="Colecionadores também viram" params={{ sort: 'popular' }} />
    </div>
  )
}

function CartPageSkeleton({ mobile }: { mobile: boolean }) {
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_332px] lg:gap-[86px]" aria-label="Carregando carrinho">
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className={mobile ? 'h-[100px] w-full rounded-xl' : 'h-[70px] w-full'} />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  )
}
