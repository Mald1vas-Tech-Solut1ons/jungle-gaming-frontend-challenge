import { useId, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { FileText, Link2, Mail, Minus, Plus, ScrollText, ShoppingCart, Star, ZoomIn } from 'lucide-react'
import { toast } from 'sonner'
import type { Nft, NftEdition } from '@/api/contracts'
import { ErrorState } from '@/components/catalog/states'
import { LinkedinIcon, TwitterIcon } from '@/components/layout/brand-icons'
import { CartCountBadge } from '@/components/layout/header'
import { BackButton, roundButton } from '@/components/layout/mobile-top-bar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAddCartItem, useCartCount } from '@/hooks/use-cart'
import { useIsMobile } from '@/hooks/use-media-query'
import { useNftDetail } from '@/hooks/use-nfts'
import { normalizeError } from '@/lib/api'
import { CHAIN_LABELS } from '@/lib/labels'
import { formatEth, mulEth } from '@/lib/money'
import { cn } from '@/lib/utils'
import { LikeButton } from './like-button'
import { NftRail } from './nft-rail'

// ---------------------------------------------------------------------------
// Estados de página
// ---------------------------------------------------------------------------

function Breadcrumb({ current }: { current?: string }) {
  return (
    <nav aria-label="Trilha de navegação" className="mb-4 text-sm font-bold text-foreground">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link to="/" className="transition-colors duration-200 hover:text-accent">
            Início
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link to="/" hash="catalogo" className="transition-colors duration-200 hover:text-accent">
            Mercado
          </Link>
        </li>
        {current && (
          <>
            <li aria-hidden="true" className="text-tan">
              /
            </li>
            <li aria-current="page" className="font-normal text-tan">
              {current}
            </li>
          </>
        )}
      </ol>
    </nav>
  )
}

function NotFoundBlock() {
  return (
    <div className="flex animate-rise flex-col items-center justify-center gap-4 bg-card px-6 py-20 text-center">
      <p className="text-6xl font-bold text-accent">404</p>
      <h1 className="text-xl font-bold">NFT não encontrado</h1>
      <p className="max-w-md text-sm text-muted-foreground">Este item pode ter sido removido do catálogo ou o endereço está incorreto.</p>
      <Button asChild variant="outline">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" aria-hidden="true">
      <div className="flex gap-4">
        <div className="hidden flex-col gap-4 md:flex">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="size-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="aspect-square flex-1 rounded-2xl" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-14 rounded-full" />
          <Skeleton className="h-7 w-14 rounded-full" />
          <Skeleton className="h-7 w-14 rounded-full" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Peças da tela
// ---------------------------------------------------------------------------

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('flex items-center gap-1', className)} aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.max(0, Math.min(1, value - index))
        return (
          <span key={index} className="relative size-4">
            <Star className="absolute inset-0 size-4 fill-secondary text-secondary" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="size-4 fill-primary text-primary" />
            </span>
          </span>
        )
      })}
    </span>
  )
}

interface GalleryProps {
  images: string[]
  name: string
  index: number
  onSelect: (index: number) => void
  onZoom: () => void
}

function Gallery({ images, name, index, onSelect, onZoom }: GalleryProps) {
  const current = images[Math.min(index, images.length - 1)]
  return (
    <div className="flex gap-4 lg:gap-6">
      {images.length > 1 && (
        <div className="hidden w-20 shrink-0 flex-col gap-4 md:flex" role="group" aria-label="Miniaturas do NFT">
          {images.map((image, imageIndex) => {
            const active = imageIndex === index
            return (
              <button
                key={image}
                type="button"
                data-testid="gallery-thumb"
                onClick={() => onSelect(imageIndex)}
                aria-label={`Ver imagem ${imageIndex + 1} de ${images.length}`}
                aria-current={active}
                className={cn(
                  'cursor-pointer overflow-hidden rounded-lg ring-2 ring-offset-2 ring-offset-background transition-[box-shadow,transform,opacity] duration-200 hover:-translate-y-0.5',
                  active ? 'ring-primary' : 'opacity-70 ring-transparent hover:opacity-100',
                )}
              >
                <img src={image} alt="" width={160} height={160} loading="lazy" className="aspect-square w-full object-cover" />
              </button>
            )
          })}
        </div>
      )}

      <div className="relative flex-1 bg-card p-4 lg:p-5">
        <div className="overflow-hidden rounded-2xl">
          <img
            key={current}
            src={current}
            alt={`Arte do NFT ${name}`}
            width={900}
            height={900}
            fetchPriority="high"
            data-testid="gallery-main"
            className="aspect-square w-full object-cover"
          />
        </div>
        <button
          type="button"
          onClick={onZoom}
          aria-label="Ampliar imagem"
          className="absolute right-6 top-6 flex size-9 cursor-pointer items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur transition-[transform,color] duration-200 hover:scale-110 hover:text-accent lg:right-7 lg:top-7"
        >
          <ZoomIn className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

interface EditionPickerProps {
  editions: NftEdition[]
  selectedId: string | undefined
  onSelect: (edition: NftEdition) => void
}

/** Edições como pílulas (radiogroup); a escolhida fica com borda âmbar. */
function EditionPicker({ editions, selectedId, onSelect }: EditionPickerProps) {
  const labelId = useId()
  const anyAvailable = editions.some((edition) => edition.available > 0)
  return (
    <div>
      <p id={labelId} className="text-sm font-bold text-foreground">
        Edição:
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="mt-2 flex flex-wrap items-center gap-2">
        {editions.map((edition) => {
          const soldOut = edition.available === 0
          const selected = edition.id === selectedId
          return (
            <label
              key={edition.id}
              data-testid="edition-option"
              title={soldOut ? 'Edição esgotada' : `${edition.available} disponíveis`}
              className={cn(
                'relative flex h-7 min-w-12 cursor-pointer items-center justify-center rounded-full border px-2.5 text-sm transition-[border-color,color,background-color] duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                selected ? 'border-primary bg-primary/10 font-bold text-accent' : 'border-rule text-muted-foreground hover:border-primary/70 hover:text-foreground',
                soldOut && 'cursor-not-allowed text-muted-foreground/50 line-through hover:border-rule hover:text-muted-foreground/50',
              )}
            >
              <input type="radio" name="edition" className="sr-only" checked={selected} disabled={soldOut} onChange={() => onSelect(edition)} />
              {edition.name}
              {soldOut && <span className="sr-only"> (esgotada)</span>}
            </label>
          )
        })}
        <span
          className={cn(
            'flex h-7 items-center rounded-full border border-rule px-2.5 text-sm uppercase',
            anyAvailable ? 'text-muted-foreground' : 'text-destructive',
          )}
        >
          {anyAvailable ? 'Aberta' : 'Esgotada'}
        </span>
      </div>
    </div>
  )
}

interface StepperProps {
  value: number
  max: number
  onChange: (value: number) => void
  size?: 'lg' | 'sm'
}

/** Stepper de quantidade do layout: botões âmbar em pílula, valor ao centro. */
function QuantityStepper({ value, max, onChange, size = 'lg' }: StepperProps) {
  const button = cn(
    'flex cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-[background-color,transform,opacity] duration-200 hover:bg-accent active:scale-90 disabled:cursor-not-allowed disabled:opacity-35',
    size === 'lg' ? 'h-12 w-8' : 'h-7 w-5',
  )
  return (
    <div className="flex items-center gap-1">
      <button type="button" className={button} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Diminuir quantidade" data-testid="quantity-minus">
        <Minus className={size === 'lg' ? 'size-5' : 'size-3.5'} strokeWidth={3} aria-hidden="true" />
      </button>
      <label htmlFor="quantity-input" className="sr-only">
        Quantidade
      </label>
      <input
        id="quantity-input"
        data-testid="quantity-input"
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        onChange={(event) => {
          const next = event.target.valueAsNumber
          if (!Number.isNaN(next)) onChange(Math.floor(next))
        }}
        className={cn('no-spin w-10 bg-transparent text-center text-foreground outline-none focus-visible:text-accent', size === 'lg' ? 'text-xl' : 'text-lg font-bold')}
      />
      <button type="button" className={button} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Aumentar quantidade" data-testid="quantity-plus">
        <Plus className={size === 'lg' ? 'size-5' : 'size-3.5'} strokeWidth={3} aria-hidden="true" />
      </button>
    </div>
  )
}

function Metadata({ nft }: { nft: Nft }) {
  return (
    <dl className="flex flex-col gap-3 text-base text-tan">
      <div className="flex gap-2">
        <dt>ID do token:</dt>
        <dd>{nft.tokenId}</dd>
      </div>
      <div className="flex gap-2">
        <dt>Coleção:</dt>
        <dd>{nft.collection}</dd>
      </div>
      <div className="flex gap-2">
        <dt>Atributos:</dt>
        <dd>{nft.attributes.join(', ')}</dd>
      </div>
    </dl>
  )
}

function ShareLinks({ nft }: { nft: Nft }) {
  const url = typeof window === 'undefined' ? '' : window.location.href
  const text = `${nft.name} na Kurio`
  const linkClass = 'flex size-8 items-center justify-center rounded-sm text-foreground transition-[color,transform] duration-200 hover:-translate-y-0.5 hover:text-accent'
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold text-foreground">Compartilhar este NFT:</span>
      <a
        className={linkClass}
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Compartilhar no LinkedIn (abre em nova aba)"
      >
        <LinkedinIcon className="size-5" />
      </a>
      <a className={linkClass} href={`mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`} aria-label="Compartilhar por e-mail">
        <Mail className="size-5" aria-hidden="true" />
      </a>
      <a
        className={linkClass}
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Compartilhar no Twitter (abre em nova aba)"
      >
        <TwitterIcon className="size-5" />
      </a>
      <button
        type="button"
        className={cn(linkClass, 'cursor-pointer')}
        aria-label="Copiar link"
        onClick={() => {
          void navigator.clipboard
            .writeText(url)
            .then(() => toast.success('Link copiado.'))
            .catch(() => toast.error('Não foi possível copiar o link.'))
        }}
      >
        <Link2 className="size-5" aria-hidden="true" />
      </button>
    </div>
  )
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`.toUpperCase().replace('0X', '0x')
}

const reviewDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

/** Abas "Detalhes do NFT" / "Avaliações de colecionadores". */
function DetailTabs({ nft }: { nft: Nft }) {
  const [tab, setTab] = useState<'details' | 'reviews'>('details')
  const baseId = useId()
  const tabs = [
    { id: 'details' as const, label: 'Detalhes do NFT' },
    { id: 'reviews' as const, label: `Avaliações de colecionadores (${nft.rating.count})` },
  ]

  return (
    <section className="mt-16">
      <div
        role="tablist"
        aria-label="Informações do NFT"
        className="no-scrollbar flex gap-8 overflow-x-auto border-b border-rule"
        onKeyDown={(event) => {
          if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
          const next = tab === 'details' ? 'reviews' : 'details'
          setTab(next)
          document.getElementById(`${baseId}-tab-${next}`)?.focus()
        }}
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            id={`${baseId}-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`${baseId}-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
            className={cn(
              'nav-underline shrink-0 cursor-pointer whitespace-nowrap pb-2 text-base transition-colors duration-200',
              tab === item.id ? 'font-bold text-accent' : 'text-foreground hover:text-accent',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        id={`${baseId}-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${tab}`}
        key={tab}
        className="animate-fade pt-6 text-sm leading-[1.8] text-muted-foreground"
      >
        {tab === 'details' ? (
          <div className="flex max-w-4xl flex-col gap-5">
            <p>
              {nft.name} é uma obra digital da coleção {nft.collection}, criada por {nft.creator}. Cada atributo fica armazenado nos metadados do
              token e verificado na {CHAIN_LABELS[nft.chain]}.
            </p>
            <p>
              A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência
              na rede. {nft.creator} recebe {nft.royaltyPercent}% de direitos autorais nas vendas secundárias.
            </p>
            <dl className="flex flex-col gap-4">
              {[
                { icon: ScrollText, label: 'Rede:', value: `Cunhado na ${CHAIN_LABELS[nft.chain]} com procedência imutável e metadados armazenados no IPFS.` },
                { icon: FileText, label: 'Contrato:', value: `${shortAddress(nft.contractAddress)} · Contrato inteligente ERC-721 verificado.` },
                {
                  icon: Star,
                  label: 'Direitos autorais:',
                  value: `${nft.royaltyPercent}% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.`,
                },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label}>
                  <dt className="flex items-center gap-2 font-bold text-foreground">
                    <Icon className="size-4 text-tan" aria-hidden="true" />
                    {label}
                  </dt>
                  <dd className="mt-1">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <ul className="grid max-w-4xl gap-4 md:grid-cols-3">
            {nft.reviews.map((review, index) => (
              <li key={review.id} className="stagger bg-card p-5" style={{ '--i': index } as CSSProperties}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-foreground">{review.author}</span>
                  <Stars value={review.rating} />
                </div>
                <p className="mt-3">{review.comment}</p>
                <p className="mt-3 text-xs text-tan">{reviewDate.format(new Date(review.createdAt))}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export function NftDetailPage({ nftId }: { nftId: string }) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { data: nft, error, refetch } = useNftDetail(nftId)
  const addToCart = useAddCartItem()
  const cartCount = useCartCount()

  const [imageIndex, setImageIndex] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [editionId, setEditionId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)

  const notFound = error !== null && normalizeError(error).code === 'NOT_FOUND'

  if (notFound) {
    return (
      <div>
        {isMobile ? <BackButton className="mb-4" /> : <Breadcrumb />}
        <NotFoundBlock />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        {isMobile ? <BackButton className="mb-4" /> : <Breadcrumb />}
        <ErrorState title="Não foi possível carregar o NFT" message={normalizeError(error).message} onRetry={() => void refetch()} />
      </div>
    )
  }

  if (!nft) {
    return (
      <div>
        {isMobile ? <BackButton className="mb-4" /> : <Breadcrumb />}
        <p className="sr-only" role="status">
          Carregando NFT…
        </p>
        <DetailSkeleton />
      </div>
    )
  }

  // Edição efetiva: a escolhida, ou a primeira disponível quando ela esgota
  // (ex.: atualização via socket). Derivada no render, sem efeito. Sem edição
  // explícita, abre na mais acessível (primeira disponível da lista).
  const selectedEdition =
    nft.editions.find((edition) => edition.id === editionId && edition.available > 0) ??
    nft.editions.find((edition) => edition.available > 0) ??
    null
  const maxQuantity = selectedEdition ? Math.min(selectedEdition.available, selectedEdition.maxPerOrder) : 0
  const effectiveQuantity = maxQuantity > 0 ? Math.min(Math.max(1, quantity), maxQuantity) : 0
  const payload = selectedEdition && effectiveQuantity > 0 ? { nftId, editionId: selectedEdition.id, quantity: effectiveQuantity } : null
  const unitPrice = selectedEdition?.price ?? nft.price
  const lineTotal = selectedEdition && effectiveQuantity > 0 ? mulEth(selectedEdition.price, effectiveQuantity) : null

  const handleAddToCart = () => {
    if (payload) addToCart.mutate(payload, { onSuccess: () => toast.success(`${nft.name} foi adicionado ao carrinho.`) })
  }
  const handleBuyNow = () => {
    if (payload) addToCart.mutate(payload, { onSuccess: () => void navigate({ to: '/cart' }) })
  }
  const handleSelectEdition = (edition: NftEdition) => {
    setEditionId(edition.id)
    setQuantity(1)
  }
  const changeQuantity = (value: number) => setQuantity(Math.min(maxQuantity, Math.max(1, value)))

  const availability = selectedEdition ? (
    <p className="text-xs text-tan" aria-live="polite">
      {selectedEdition.available} disponíveis · máx. {selectedEdition.maxPerOrder} por pedido
    </p>
  ) : (
    <p className="border-l-4 border-warning bg-warning/10 px-3 py-2 text-sm text-warning" role="status">
      Todas as edições deste NFT estão esgotadas.
    </p>
  )

  const zoomDialog = (
    <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
      <DialogContent className="max-w-[min(92vw,820px)] border-b-0 bg-card p-3">
        <DialogTitle className="sr-only">{nft.name} ampliado</DialogTitle>
        <img src={nft.images[imageIndex]} alt={`Arte do NFT ${nft.name} ampliada`} className="aspect-square w-full rounded-xl object-cover" />
      </DialogContent>
    </Dialog>
  )

  // ------------------------------- Mobile -------------------------------
  if (isMobile) {
    return (
      <div className="-mx-4 -mt-4 pb-48">
        <div className="relative bg-card px-4 pb-12 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <BackButton />
            <div className="flex items-center gap-2">
              <Link
                to="/cart"
                data-testid="header-cart"
                aria-label={cartCount > 0 ? `Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}` : 'Carrinho'}
                className={cn(roundButton, 'relative')}
              >
                <ShoppingCart className="size-[18px]" aria-hidden="true" />
                <CartCountBadge count={cartCount} className="-right-1 -top-1" />
              </Link>
              <LikeButton nftId={nft.id} label={nft.name} testId="like-button" className={roundButton} />
            </div>
          </div>
          <button type="button" onClick={() => setZoomOpen(true)} className="block w-full cursor-zoom-in overflow-hidden rounded-[22px]" aria-label="Ampliar imagem">
            <img
              src={nft.images[imageIndex]}
              alt={`Arte do NFT ${nft.name}`}
              width={720}
              height={720}
              fetchPriority="high"
              data-testid="gallery-main"
              className="aspect-[360/330] w-full object-cover"
            />
          </button>
          {nft.images.length > 1 && (
            <div className="mt-3 flex justify-center gap-2" role="group" aria-label="Imagens do NFT">
              {nft.images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setImageIndex(index)}
                  aria-label={`Ver imagem ${index + 1} de ${nft.images.length}`}
                  aria-current={index === imageIndex}
                  className="flex h-6 min-w-6 cursor-pointer items-center justify-center"
                >
                  <span
                    aria-hidden="true"
                    className={cn('h-1.5 rounded-full bg-primary transition-[width,opacity] duration-300', index === imageIndex ? 'w-5' : 'w-1.5 opacity-60')}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative -mt-8 animate-rise rounded-t-[28px] bg-card px-6 pb-8 pt-7 shadow-[0_-18px_30px_-20px_rgb(0_0_0_/_0.8)]">
          <div className="flex items-start justify-between gap-3">
            <h1 data-testid="nft-title" className="text-xl font-bold leading-tight">
              {nft.name}
            </h1>
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-primary px-2 py-0.5 text-sm text-foreground">
              <Star className="size-4 fill-primary text-primary" aria-hidden="true" />
              <span className="font-bold">{nft.rating.average.toFixed(1).replace('.', ',')}</span>
              <span className="text-tan">({nft.rating.count})</span>
              <span className="sr-only">avaliações de colecionadores</span>
            </span>
          </div>
          <p className="mt-3 text-sm leading-[1.7] text-muted-foreground">{nft.description}</p>
          <div className="mt-4">
            <EditionPicker editions={nft.editions} selectedId={selectedEdition?.id} onSelect={handleSelectEdition} />
          </div>
          <div className="mt-2">{availability}</div>
          <div className="mt-5 text-sm">
            <Metadata nft={nft} />
          </div>
        </div>

        <div className="px-4">
          <NftRail title="Mais desta coleção" params={{ category: [nft.category] }} excludeId={nft.id} testId="more-from-collection" />
        </div>

        {/* Barra de compra fixa, como no frame mobile */}
        <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-[28px] bg-card px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5 shadow-[0_-16px_32px_-12px_rgb(0_0_0_/_0.75)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-tan">Qtd.</span>
              {selectedEdition ? <QuantityStepper value={effectiveQuantity} max={maxQuantity} onChange={changeQuantity} size="sm" /> : <span>—</span>}
            </div>
            <span data-testid="nft-price" className="text-xl font-bold text-accent" aria-live="polite">
              {formatEth(lineTotal ?? unitPrice)}
            </span>
          </div>
          <div className="mt-4 flex gap-3">
            <Button
              type="button"
              variant="pill"
              size="pill"
              className="flex-1 text-lg"
              onClick={handleBuyNow}
              disabled={!payload}
              isPending={addToCart.isPending}
              data-testid="buy-now"
            >
              Comprar NFT
            </Button>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!payload || addToCart.isPending}
              aria-label={`Adicionar ${nft.name} ao carrinho`}
              data-testid="add-to-cart"
              className="flex size-[60px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-rule bg-tile text-accent transition-transform duration-200 active:scale-90 disabled:opacity-40"
            >
              <ShoppingCart className="size-6" aria-hidden="true" />
            </button>
          </div>
        </div>
        {zoomDialog}
      </div>
    )
  }

  // ------------------------------ Desktop -------------------------------
  return (
    <div>
      <Breadcrumb current={nft.name} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div>
          <Gallery images={nft.images} name={nft.name} index={imageIndex} onSelect={setImageIndex} onZoom={() => setZoomOpen(true)} />
        </div>

        <div className="flex animate-rise flex-col [animation-delay:90ms]">
          <h1 data-testid="nft-title" className="text-[28px] font-bold leading-tight">
            {nft.name}
          </h1>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-3">
            <span data-testid="nft-price" className="text-[22px] font-bold text-accent" aria-live="polite">
              {formatEth(unitPrice)}
            </span>
            <span className="flex items-center gap-2 text-sm text-foreground">
              <Stars value={nft.rating.average} />
              <span>
                {nft.rating.count} avaliações de colecionadores
                <span className="sr-only">, média {nft.rating.average.toFixed(1).replace('.', ',')} de 5</span>
              </span>
            </span>
          </div>

          <h2 className="mt-4 text-sm font-bold text-foreground">Sobre este NFT:</h2>
          <p className="mt-2 text-sm leading-[1.8] text-muted-foreground">{nft.description}</p>

          <div className="mt-4">
            <EditionPicker editions={nft.editions} selectedId={selectedEdition?.id} onSelect={handleSelectEdition} />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            {selectedEdition ? <QuantityStepper value={effectiveQuantity} max={maxQuantity} onChange={changeQuantity} /> : <span />}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                className="h-10 min-w-[132px] uppercase"
                onClick={handleBuyNow}
                disabled={!payload}
                isPending={addToCart.isPending}
                data-testid="buy-now"
              >
                Comprar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddToCart}
                disabled={!payload || addToCart.isPending}
                aria-label={`Adicionar ${nft.name} ao carrinho`}
                title="Adicionar ao carrinho"
                data-testid="add-to-cart"
              >
                <ShoppingCart aria-hidden="true" />
              </Button>
              <LikeButton
                nftId={nft.id}
                label={nft.name}
                testId="like-button"
                withText
                className="h-10 rounded-md border border-primary px-3 text-base text-accent hover:bg-primary/10"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {availability}
            {lineTotal && effectiveQuantity > 1 && (
              <p className="animate-fade text-sm text-foreground" aria-live="polite">
                Total: <span className="font-bold text-accent">{formatEth(lineTotal)}</span>
              </p>
            )}
          </div>

          <div className="mt-6">
            <Metadata nft={nft} />
          </div>
          <div className="mt-4">
            <ShareLinks nft={nft} />
          </div>
        </div>
      </div>

      <DetailTabs nft={nft} />
      <NftRail title="Mais desta coleção" params={{ category: [nft.category] }} excludeId={nft.id} testId="more-from-collection" />
      {zoomDialog}
    </div>
  )
}
