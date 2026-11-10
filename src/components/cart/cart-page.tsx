import { useEffect, useMemo, useRef } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useApplyCoupon, useCart, useRemoveCartItem, useRemoveCoupon, useUpdateCartItem } from '@/hooks/use-cart'
import { useQuote } from '@/hooks/use-order'
import { normalizeError } from '@/lib/api'
import { CartCouponForm } from './cart-coupon-form'
import { CartEmptyState } from './cart-empty-state'
import { CartItemCard } from './cart-item-card'
import { CartSummary } from './cart-summary'

export function CartPage() {
  const { data: cart, isLoading, error, refetch } = useCart()
  const { quote, requestQuote, isPending: quotePending } = useQuote()
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

  if (isLoading && !cart) return <CartPageSkeleton />

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header>
        <h1 className="display-title text-foreground">Carrinho</h1>
        {items.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? 'item' : 'itens'} · valores calculados pela cotação da rede
          </p>
        )}
      </header>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar o carrinho</AlertTitle>
          <AlertDescription>{normalizeError(error).message}</AlertDescription>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </Alert>
      ) : items.length === 0 ? (
        <CartEmptyState />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <ul className="space-y-3">
            {items.map((item) => (
              <CartItemCard
                key={item.id}
                item={item}
                pending={updatingItemId === item.id || removingItemId === item.id}
                onChangeQuantity={(quantity) => updateItem.mutate({ itemId: item.id, quantity })}
                onRemove={() => removeItem.mutate(item.id)}
              />
            ))}
          </ul>
          <aside className="lg:sticky lg:top-20">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Resumo do pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <CartCouponForm
                  couponCode={cart?.couponCode ?? null}
                  percentOff={quote?.coupon?.percentOff ?? null}
                  applyPending={applyCoupon.isPending}
                  removePending={removeCoupon.isPending}
                  onApply={(code) => applyCoupon.mutate(code)}
                  onRemove={() => removeCoupon.mutate()}
                />
                <CartSummary quote={quote} quotePending={quotePending} itemsCount={items.length} />
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </div>
  )
}

function CartPageSkeleton() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]" aria-label="Carregando carrinho">
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-4 rounded-lg border border-border bg-card p-4">
            <Skeleton className="size-20 rounded-md" />
            <div className="flex flex-1 flex-col justify-between gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Resumo do pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
