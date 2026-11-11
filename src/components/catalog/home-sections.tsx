import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import type { Nft } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/** Card "NFT em destaque / Oferta limitada", abaixo dos filtros. */
export function FeaturedCard({ nft }: { nft: Nft | undefined }) {
  if (!nft) {
    return (
      <div className="bg-card" aria-hidden="true">
        <div className="px-4 pb-3 pt-5">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="ml-8 mt-2 h-5 w-40" />
        </div>
        <Skeleton className="aspect-[310/365] w-full rounded-2xl" />
      </div>
    )
  }
  return (
    <Link
      to="/nft/$nftId"
      params={{ nftId: nft.id }}
      className="group block animate-rise bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="px-4 pb-3 pt-5">
        <p className="text-xl font-bold uppercase leading-tight text-accent">NFT em destaque</p>
        <p className="mt-1 pl-8 text-base font-bold uppercase text-foreground">Oferta limitada</p>
      </div>
      <div className="overflow-hidden rounded-2xl">
        <img
          src={nft.images[0]}
          alt={`Arte do NFT ${nft.name}`}
          width={620}
          height={730}
          loading="lazy"
          decoding="async"
          className="aspect-[310/365] w-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.05]"
        />
      </div>
    </Link>
  )
}

/** Dois banners editoriais: arte à esquerda, chamada alinhada à direita. */
export function PromoBanners({ nfts }: { nfts: Nft[] }) {
  const banners = [
    {
      title: ['Lançamentos gênesis', 'de edição limitada'],
      text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
      search: { featured: true },
      nft: nfts[0],
    },
    {
      title: ['Arte digital selecionada', 'e muito mais'],
      text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
      search: { category: ['art' as const] },
      nft: nfts[1],
    },
  ]
  return (
    <section aria-label="Coleções em destaque" className="grid gap-6 lg:grid-cols-2 lg:gap-10">
      {banners.map((banner) => (
        <article
          key={banner.title[0]}
          className="group grid grid-cols-[38%_1fr] overflow-hidden bg-card sm:grid-cols-[200px_1fr] lg:grid-cols-[240px_1fr] xl:grid-cols-[286px_1fr]"
        >
          <div className="overflow-hidden rounded-xl">
            {banner.nft ? (
              <img
                src={banner.nft.images[0]}
                alt=""
                width={572}
                height={500}
                loading="lazy"
                decoding="async"
                className="h-full min-h-[180px] w-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.06] lg:h-[250px]"
              />
            ) : (
              <Skeleton className="h-full min-h-[180px] w-full rounded-xl lg:h-[250px]" />
            )}
          </div>
          <div className="flex flex-col items-end justify-center gap-3 p-4 text-right lg:p-6">
            <h2 className="text-base font-bold leading-[1.5] text-foreground">
              {banner.title[0]}
              <br />
              {banner.title[1]}
            </h2>
            <p className="max-w-[17rem] text-sm leading-[1.7] text-muted-foreground">{banner.text}</p>
            <Button asChild size="sm" className="h-9 px-4 text-sm">
              <Link to="/" search={banner.search} hash="catalogo">
                Explorar
                <ArrowRight className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </article>
      ))}
    </section>
  )
}

/** Conteúdo editorial estático da marca (as páginas de leitura ficam fora do escopo). */
const POSTS = [
  {
    date: '12 de setembro',
    read: 'Leitura de 6 min',
    title: 'Como funciona a propriedade de NFTs',
    text: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: '/nfts/ape-03.webp',
  },
  {
    date: '13 de setembro',
    read: 'Leitura de 2 min',
    title: '10 artistas digitais para acompanhar',
    text: 'Conheça criadores que moldam a cultura digital.',
    image: '/nfts/ape-01.webp',
  },
  {
    date: '15 de setembro',
    read: 'Leitura de 3 min',
    title: 'Raridade, atributos e procedência',
    text: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    image: '/nfts/ape-02.webp',
  },
  {
    date: '15 de setembro',
    read: 'Leitura de 2 min',
    title: 'Como proteger sua carteira',
    text: 'Proteja sua carteira, seus ativos e sua identidade.',
    image: '/nfts/ape-04.webp',
  },
]

export function MintJournal() {
  return (
    <section aria-labelledby="journal-title">
      <h2 id="journal-title" className="text-center text-2xl font-bold text-foreground md:text-[28px]">
        Diário da Cunhagem
      </h2>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
      </p>
      <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        {POSTS.map((post) => (
          <li key={post.title}>
            <button
              type="button"
              onClick={() => toast.info('O Diário da Cunhagem é conteúdo editorial fora do escopo desta entrega.')}
              className="group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-t-xl bg-card text-left transition-[transform,box-shadow] duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-[0_22px_40px_-22px_rgb(0_0_0_/_0.9)]"
            >
              <div className="overflow-hidden">
                <img
                  src={post.image}
                  alt=""
                  width={560}
                  height={400}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[7/5] w-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.06]"
                />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="text-[11px] text-muted-foreground">
                  {post.date} <span aria-hidden="true">|</span> {post.read}
                </p>
                <h3 className="text-sm font-bold leading-[1.45] text-foreground">{post.title}</h3>
                <p className="text-xs leading-[1.6] text-muted-foreground">{post.text}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-xs font-bold text-accent">
                  Ler mais
                  <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
