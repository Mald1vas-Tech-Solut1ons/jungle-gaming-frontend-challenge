import type { CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import { Search, ShoppingCart } from 'lucide-react'
import type { Nft } from '@/api/contracts'
import { LikeButton } from '@/components/nft/like-button'
import { RarityBadge } from '@/components/nft/rarity-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAddCartItem } from '@/hooks/use-cart'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

const actionTile =
  'flex size-9 cursor-pointer items-center justify-center rounded-sm bg-card text-foreground shadow-[0_6px_16px_-6px_rgb(0_0_0_/_0.8)] transition-[color,transform] duration-200 hover:-translate-y-0.5 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50'

interface NftCardProps {
  nft: Nft
  /** Primeira imagem da dobra: carrega com prioridade (LCP). */
  priority?: boolean
  /** Posição na grade, para a entrada escalonada. */
  index?: number
  className?: string
}

/**
 * Card do catálogo (Figma): painel escuro com a arte arredondada, nome e preço
 * abaixo. No hover/foco aparece a barra de ações rápidas (carrinho, favorito,
 * ver); no mobile o favorito fica fixo no canto da arte.
 */
export function NftCard({ nft, priority = false, index = 0, className }: NftCardProps) {
  const addToCart = useAddCartItem()
  const edition = nft.editions.find((item) => item.available > 0)
  const soldOut = !edition

  return (
    <article
      data-testid="nft-card"
      // O card prioritário (candidato a LCP) entra sem animação de opacidade
      className={cn('group relative flex flex-col', !priority && 'stagger', className)}
      style={{ '--i': Math.min(index, 11) } as CSSProperties}
    >
      <div className="relative bg-card p-1.5 transition-[background-color,transform,box-shadow] duration-300 ease-out-soft group-hover:-translate-y-1 group-hover:bg-tile group-hover:shadow-[0_22px_40px_-22px_rgb(0_0_0_/_0.9)] md:px-1 md:py-5">
        <Link
          to="/nft/$nftId"
          params={{ nftId: nft.id }}
          aria-label={`${nft.name}, ${formatEth(nft.price)}`}
          className="block overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img
            src={nft.images[0]}
            alt={`Arte do NFT ${nft.name}, coleção ${nft.collection}`}
            width={500}
            height={500}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            className={cn(
              'aspect-square w-full object-cover transition-transform duration-500 ease-out-soft group-hover:scale-[1.06]',
              soldOut && 'opacity-60 grayscale-[0.4]',
            )}
          />
        </Link>

        {nft.rarity !== 'common' && <RarityBadge rarity={nft.rarity} className="absolute left-0 top-0" />}
        {soldOut && (
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-sm bg-background/90 px-2 py-0.5 text-xs font-bold uppercase text-muted-foreground">
            Esgotado
          </span>
        )}

        {/* Mobile: favorito fixo no canto, como no frame mobile */}
        <LikeButton
          nftId={nft.id}
          label={nft.name}
          className="absolute right-3 top-3 size-8 rounded-full border border-rule bg-card/90 text-accent md:hidden"
        />

        {/* Desktop/tablet: ações rápidas reveladas no hover e no foco por teclado */}
        <div className="absolute inset-x-0 bottom-3 hidden translate-y-2 justify-center gap-2 opacity-0 transition-[opacity,transform] duration-300 ease-out-soft group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 md:flex">
          <button
            type="button"
            className={actionTile}
            disabled={soldOut || addToCart.isPending}
            aria-label={soldOut ? `${nft.name} está esgotado` : `Adicionar ${nft.name} ao carrinho`}
            data-testid="card-add-to-cart"
            onClick={() => {
              if (edition) addToCart.mutate({ nftId: nft.id, editionId: edition.id, quantity: 1 })
            }}
          >
            <ShoppingCart className="size-[18px]" aria-hidden="true" />
          </button>
          <LikeButton nftId={nft.id} label={nft.name} className={cn(actionTile, 'h-9 w-9')} />
          <Link to="/nft/$nftId" params={{ nftId: nft.id }} className={actionTile} aria-label={`Ver detalhes de ${nft.name}`} tabIndex={-1}>
            <Search className="size-[18px]" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="px-1 pt-2.5 md:px-0">
        <h3 data-testid="nft-card-name" className="truncate text-[15px] leading-tight text-foreground md:text-base">
          <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="transition-colors duration-200 hover:text-accent" tabIndex={-1}>
            {nft.name}
          </Link>
        </h3>
        <p data-testid="nft-card-price" className="mt-1 text-base font-bold leading-tight text-accent">
          {formatEth(nft.price)}
        </p>
      </div>
    </article>
  )
}

/** Placeholder com as mesmas dimensões do card real (evita layout shift). */
export function NftCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col', className)} aria-hidden="true">
      <div className="bg-card p-1.5 md:px-1 md:py-5">
        <Skeleton className="aspect-square w-full rounded-xl" />
      </div>
      <div className="px-1 pt-2.5 md:px-0">
        <Skeleton className="h-[18px] w-3/4 md:h-5" />
        <Skeleton className="mt-1 h-5 w-1/3" />
      </div>
    </div>
  )
}
