import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Minus, Plus, ShoppingCart, Zap } from 'lucide-react'
import type { NftEdition } from '@/api/contracts'
import { ErrorState } from '@/components/catalog/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useAddCartItem } from '@/hooks/use-cart'
import { useNftDetail } from '@/hooks/use-nfts'
import { normalizeError } from '@/lib/api'
import { CATEGORY_LABELS, CHAIN_LABELS } from '@/lib/labels'
import { formatEth, mulEth } from '@/lib/money'
import { cn } from '@/lib/utils'
import { LikeButton } from './like-button'
import { RarityBadge } from './rarity-badge'

function BackLink() {
  return (
    <Link
      to="/"
      data-testid="back-link"
      className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Voltar ao catálogo
    </Link>
  )
}

function NotFoundBlock() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card px-6 py-20 text-center">
      <p className="display-title text-primary">404</p>
      <h1 className="text-xl font-semibold">NFT não encontrado</h1>
      <p className="max-w-md text-sm text-muted-foreground">Este item pode ter sido removido do catálogo ou o endereço está incorreto.</p>
      <Button asChild variant="outline">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start" aria-hidden="true">
      <div className="flex flex-col gap-3">
        <Skeleton className="aspect-[4/3] w-full rounded-lg" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="size-16 md:size-20" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-2 h-48 w-full rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </div>
    </div>
  )
}

interface GalleryProps {
  images: string[]
  name: string
  index: number
  onSelect: (index: number) => void
}

function Gallery({ images, name, index, onSelect }: GalleryProps) {
  const current = images[Math.min(index, images.length - 1)]
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <img key={current} src={current} alt={name} width={960} height={720} data-testid="gallery-main" className="aspect-[4/3] w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Miniaturas do NFT">
          {images.map((image, imageIndex) => {
            const active = imageIndex === index
            return (
              <button
                key={image}
                type="button"
                data-testid="gallery-thumb"
                onClick={() => onSelect(imageIndex)}
                aria-label={`Ver imagem ${imageIndex + 1} de ${images.length} de ${name}`}
                aria-current={active}
                className={cn('overflow-hidden rounded-md border-2 transition-colors', active ? 'border-primary' : 'border-border hover:border-primary/60')}
              >
                <img src={image} alt={`${name} — imagem ${imageIndex + 1}`} width={96} height={72} className="size-16 object-cover md:size-20" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function NftDetailPage({ nftId }: { nftId: string }) {
  const navigate = useNavigate()
  const { data: nft, error, refetch } = useNftDetail(nftId)
  const addToCart = useAddCartItem()

  const [imageIndex, setImageIndex] = useState(0)
  const [editionId, setEditionId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)

  const notFound = error !== null && normalizeError(error).code === 'NOT_FOUND'

  if (notFound) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <NotFoundBlock />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <ErrorState title="Não foi possível carregar o NFT" message={normalizeError(error).message} onRetry={() => void refetch()} />
      </div>
    )
  }

  if (!nft) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <p className="sr-only" role="status">
          Carregando NFT…
        </p>
        <DetailSkeleton />
      </div>
    )
  }

  // Edição efetiva: a escolhida, ou a primeira disponível quando ela esgota
  // (ex.: atualização via socket). Derivada no render, sem efeito.
  const selectedEdition =
    nft.editions.find((edition) => edition.id === editionId && edition.available > 0) ??
    nft.editions.find((edition) => edition.available > 0) ??
    null
  const maxQuantity = selectedEdition ? Math.min(selectedEdition.available, selectedEdition.maxPerOrder) : 0
  const effectiveQuantity = maxQuantity > 0 ? Math.min(Math.max(1, quantity), maxQuantity) : 0
  const payload = selectedEdition && effectiveQuantity > 0 ? { nftId, editionId: selectedEdition.id, quantity: effectiveQuantity } : null

  const handleAddToCart = () => {
    if (payload) addToCart.mutate(payload)
  }

  const handleBuyNow = () => {
    if (!payload) return
    addToCart.mutate(payload, { onSuccess: () => void navigate({ to: '/cart' }) })
  }

  const handleSelectEdition = (edition: NftEdition) => {
    setEditionId(edition.id)
    setQuantity(1)
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink />

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <Gallery images={nft.images} name={nft.name} index={imageIndex} onSelect={setImageIndex} />

        <div className="flex flex-col gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{nft.collection}</p>
            <h1 data-testid="nft-title" className="mt-1 text-2xl font-bold leading-tight md:text-3xl">
              {nft.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">por {nft.creator}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RarityBadge rarity={nft.rarity} />
            <Badge variant="outline">{CATEGORY_LABELS[nft.category]}</Badge>
            <Badge variant="outline">{CHAIN_LABELS[nft.chain]}</Badge>
          </div>

          <div className="flex items-center gap-2">
            <LikeButton nftId={nft.id} label={nft.name} testId="like-button" />
            <span className="text-sm text-muted-foreground">
              {nft.likes} {nft.likes === 1 ? 'curtida' : 'curtidas'}
            </span>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">{nft.description}</p>

          <Card className="p-4 md:p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Edições</h2>

            <div role="radiogroup" aria-label="Edições disponíveis" className="mt-3 space-y-2">
              {nft.editions.map((edition) => {
                const soldOut = edition.available === 0
                const selected = edition.id === selectedEdition?.id
                return (
                  <label
                    key={edition.id}
                    data-testid="edition-option"
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                      selected ? 'border-primary bg-surface' : 'bg-card hover:border-primary/50',
                      soldOut && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="edition"
                        className="sr-only"
                        checked={selected}
                        disabled={soldOut}
                        onChange={() => handleSelectEdition(edition)}
                      />
                      <span
                        aria-hidden="true"
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded-full border',
                          selected ? 'border-primary' : 'border-muted-foreground/60',
                        )}
                      >
                        {selected && <span className="size-2 rounded-full bg-primary" />}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{edition.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {soldOut
                            ? 'Sem unidades disponíveis'
                            : `${edition.available} disponíveis · máx. ${edition.maxPerOrder} por pedido`}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {soldOut && <Badge variant="destructive">Esgotada</Badge>}
                      <span className="text-sm font-bold text-primary">{formatEth(edition.price)}</span>
                    </span>
                  </label>
                )
              })}
            </div>

            {selectedEdition && effectiveQuantity > 0 && (
              <>
                <Separator className="my-5" />

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Quantidade</span>
                    <div className="flex items-center rounded-md border border-border bg-card">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                        disabled={effectiveQuantity <= 1}
                        aria-label="Diminuir quantidade"
                        data-testid="quantity-minus"
                      >
                        <Minus className="size-4" aria-hidden="true" />
                      </Button>
                      <Label htmlFor="quantity-input" className="sr-only">
                        Quantidade
                      </Label>
                      <Input
                        id="quantity-input"
                        data-testid="quantity-input"
                        type="number"
                        min={1}
                        max={maxQuantity}
                        value={effectiveQuantity}
                        onChange={(event) => {
                          const next = event.target.valueAsNumber
                          if (!Number.isNaN(next)) setQuantity(Math.min(maxQuantity, Math.max(1, Math.floor(next))))
                        }}
                        className="h-9 w-14 border-0 bg-transparent text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
                        disabled={effectiveQuantity >= maxQuantity}
                        aria-label="Aumentar quantidade"
                        data-testid="quantity-plus"
                      >
                        <Plus className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total</span>
                    <span data-testid="nft-price" className="text-2xl font-bold text-accent">
                      {formatEth(mulEth(selectedEdition.price, effectiveQuantity))}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleAddToCart}
                    isPending={addToCart.isPending}
                    data-testid="add-to-cart"
                  >
                    <ShoppingCart className="size-4" aria-hidden="true" />
                    Adicionar ao carrinho
                  </Button>
                  <Button type="button" className="flex-1" onClick={handleBuyNow} isPending={addToCart.isPending} data-testid="buy-now">
                    <Zap className="size-4" aria-hidden="true" />
                    Comprar agora
                  </Button>
                </div>
              </>
            )}

            {!selectedEdition && (
              <div className="mt-4 rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-warning">
                Todas as edições deste NFT estão esgotadas.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
