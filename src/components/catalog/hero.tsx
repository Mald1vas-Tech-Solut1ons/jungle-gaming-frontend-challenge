import { Button } from '@/components/ui/button'
import { useNftList } from '@/hooks/use-nfts'
import { NftCard, NftCardSkeleton } from './nft-card'

const FEATURED_COUNT = 4

/** Hero com destaques; omitido quando não há itens em destaque. */
export function HeroSection() {
  const { data, isLoading, error } = useNftList({ featured: true, pageSize: FEATURED_COUNT })

  if (error) return null
  if (data && data.items.length === 0) return null

  return (
    <section data-testid="hero" aria-labelledby="hero-title" className="rounded-lg border border-border bg-card p-6 md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl space-y-4">
          <h1 id="hero-title" className="display-title text-primary">
            Jungle Marketplace
          </h1>
          <p className="text-xl font-bold leading-snug md:text-2xl">Colecione, troque e exiba NFTs raros da selva.</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Um mercado retro-pixel de arte digital: descubra peças únicas, marque favoritas e compre edições limitadas em segundos.
          </p>
          <Button asChild>
            <a href="#catalogo">Explorar coleção</a>
          </Button>
        </div>
      </div>

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Destaques da semana</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
        {isLoading || !data
          ? Array.from({ length: FEATURED_COUNT }, (_, index) => <NftCardSkeleton key={index} />)
          : data.items.map((nft) => <NftCard key={nft.id} nft={nft} />)}
      </div>
    </section>
  )
}
