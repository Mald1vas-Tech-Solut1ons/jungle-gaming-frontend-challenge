import { useNftList } from '@/hooks/use-nfts'
import { Button } from '@/components/ui/button'
import { NftCard, NftCardSkeleton } from './nft-card'

const FEATURED_COUNT = 4

/** Hero com destaques; omitido quando não há itens em destaque. */
export function HeroSection() {
  const { data, isLoading, error } = useNftList({ featured: true, pageSize: FEATURED_COUNT })

  if (error) return null
  if (data && data.items.length === 0) return null

  return (
    <section data-testid="hero" aria-labelledby="hero-title" className="flex flex-col gap-10">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-5">
          <p className="text-sm font-medium text-muted-foreground">Bem-vindo a Kurio</p>
          <h1 id="hero-title" className="display-title text-4xl text-foreground md:text-5xl">
            Seja dono do futuro
            <br />
            <span className="text-accent">da arte digital</span>
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Colecione edições limitadas de arte, games e cultura digital. Descubra criadores, acompanhe lançamentos e
            negocie com segurança — tudo em um só marketplace.
          </p>
          <Button asChild size="lg">
            <a href="#catalogo">Explorar</a>
          </Button>
        </div>
        <div className="hidden shrink-0 lg:block" aria-hidden="true">
          <img
            src="/nfts/ape-01.webp"
            alt=""
            width={420}
            height={315}
            fetchPriority="high"
            className="rounded-xl border border-border object-cover shadow-lg"
          />
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Destaques da semana</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
          {isLoading || !data
            ? Array.from({ length: FEATURED_COUNT }, (_, index) => <NftCardSkeleton key={index} />)
            : data.items.map((nft, index) => <NftCard key={nft.id} nft={nft} priority={index === 0} />)}
        </div>
      </div>
    </section>
  )
}
