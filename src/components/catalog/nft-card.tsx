import { Link } from '@tanstack/react-router'
import type { Nft } from '@/api/contracts'
import { LikeButton } from '@/components/nft/like-button'
import { RarityBadge } from '@/components/nft/rarity-badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/money'

export function NftCard({ nft, priority = false }: { nft: Nft; priority?: boolean }) {
  return (
    <Card data-testid="nft-card" className="group relative flex flex-col overflow-hidden">
      <Link
        to="/nft/$nftId"
        params={{ nftId: nft.id }}
        className="flex flex-1 flex-col rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-surface">
          <img
            src={nft.images[0]}
            alt={`NFT ${nft.name} da coleção ${nft.collection}`}
            width={640}
            height={480}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
          />
          <RarityBadge rarity={nft.rarity} className="absolute left-2 top-2 border-background/60 bg-background/85 backdrop-blur-sm" />
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <h3 data-testid="nft-card-name" className="truncate text-sm font-semibold leading-tight">
            {nft.name}
          </h3>
          <p className="truncate text-xs text-muted-foreground">{nft.collection}</p>
          <p className="mt-auto pt-2 text-sm font-bold text-primary">{formatEth(nft.price)}</p>
        </div>
      </Link>
      <LikeButton
        nftId={nft.id}
        label={nft.name}
        testId="like-button"
        className="absolute right-2 top-2 bg-background/80 backdrop-blur-sm hover:bg-background"
      />
    </Card>
  )
}

/** Placeholder com as mesmas dimensões do card real (evita layout shift). */
export function NftCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card" aria-hidden="true">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  )
}
