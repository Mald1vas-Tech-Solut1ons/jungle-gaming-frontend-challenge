import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNftList } from '@/hooks/use-nfts'
import { cn } from '@/lib/utils'

/** Arte do primeiro slide: mesma imagem pré-carregada no index.html (LCP). */
const HERO_IMAGE = '/nfts/ape-01.webp'
const SLIDE_COUNT = 3
const ROTATE_MS = 6000

/** Parâmetros dos lançamentos em destaque (compartilhados com o card "NFT em destaque"). */
export const FEATURED_PARAMS = { featured: true, pageSize: 4 } as const

/**
 * Hero da página inicial. O texto é estático (pinta de imediato); a arte
 * alterna entre os lançamentos em destaque vindos da API, com indicadores
 * clicáveis. A rotação pausa no hover/foco e não roda com movimento reduzido.
 */
export function HeroSection() {
  const { data } = useNftList(FEATURED_PARAMS)
  const slides = data?.items.slice(0, SLIDE_COUNT) ?? []
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const current = slides.length > 0 ? active % slides.length : 0
  const slide = slides[current]

  useEffect(() => {
    if (paused || slides.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setActive((value) => value + 1), ROTATE_MS)
    return () => window.clearInterval(timer)
  }, [paused, slides.length])

  const dots = (
    <div className="flex items-center gap-2" role="group" aria-label="Lançamentos em destaque">
      {Array.from({ length: SLIDE_COUNT }, (_, index) => {
        const target = slides[index]
        const selected = index === current
        return (
          // Área de toque de 24px (WCAG 2.5.8); o ponto visível fica dentro
          <button
            key={index}
            type="button"
            disabled={!target}
            aria-label={target ? `Mostrar ${target.name}` : `Destaque ${index + 1}`}
            aria-current={selected}
            onClick={() => setActive(index)}
            className="group/dot flex h-6 min-w-6 cursor-pointer items-center justify-center disabled:cursor-default"
          >
            <span
              aria-hidden="true"
              className={cn(
                'h-1.5 rounded-full bg-primary transition-[width,opacity] duration-300 ease-out-soft',
                selected ? 'w-5 opacity-100' : 'w-1.5 opacity-70 group-hover/dot:opacity-100',
              )}
            />
          </button>
        )
      })}
    </div>
  )

  // `key` pelo src: o primeiro destaque usa a mesma arte pré-carregada no
  // index.html, então a imagem do LCP não é recriada quando os dados chegam.
  const artSrc = slide?.images[0] ?? HERO_IMAGE
  const art = (
    <img
      key={artSrc}
      src={artSrc}
      alt={slide ? `Arte do NFT ${slide.name}` : ''}
      width={900}
      height={900}
      fetchPriority="high"
      decoding="async"
      className={cn('size-full object-cover', slide && active > 0 && 'animate-fade')}
    />
  )

  return (
    <section
      data-testid="hero"
      aria-labelledby="hero-title"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="relative overflow-hidden rounded-[28px] bg-card p-4 md:overflow-visible md:rounded-none md:bg-transparent md:p-0"
    >
      {/* Mobile: círculos decorativos do cartão do hero */}
      <span aria-hidden="true" className="absolute -left-10 -top-16 size-56 rounded-full bg-secondary/60 md:hidden" />
      <span aria-hidden="true" className="absolute -bottom-24 left-24 size-56 rounded-full bg-tile md:hidden" />

      <div className="relative grid grid-cols-[1fr_auto] items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:gap-8 lg:gap-16">
        <div className="min-w-0 md:py-6 md:pl-8 lg:pl-10">
          <p className="animate-rise text-sm tracking-[0.08em] text-foreground">Bem-vindo à Kurio</p>
          <h1
            id="hero-title"
            className="display-title mt-1 animate-rise text-xl leading-[1.5] text-foreground [animation-delay:80ms] md:mt-2 md:text-[32px] lg:text-[42px] lg:leading-[1.65]"
          >
            Seja dono <span className="md:hidden">da cultura digital</span>
            <span className="hidden md:inline">
              do futuro
              <br />
              da arte digital
            </span>
          </h1>
          <p className="mt-1 max-w-[34rem] animate-rise text-sm leading-[1.7] text-muted-foreground [animation-delay:160ms] md:mt-2 md:leading-[2]">
            <span className="md:hidden">Descubra NFTs selecionados de criadores do mundo todo.</span>
            <span className="hidden md:inline">
              Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma
              parte da cultura da internet.
            </span>
          </p>

          <div className="mt-1 animate-rise [animation-delay:240ms] md:mt-7">
            <Button asChild className="hidden h-10 w-36 uppercase md:inline-flex">
              <a href="#catalogo">Explorar</a>
            </Button>
            <a href="#catalogo" className="group/cta inline-flex items-center gap-2 font-bold uppercase text-accent md:hidden">
              Explorar
              <ArrowRight className="size-5 transition-transform duration-200 group-active/cta:translate-x-1" aria-hidden="true" />
            </a>
          </div>

          <div className="mt-8 hidden justify-end pr-2 md:flex">{dots}</div>
        </div>

        <div className="relative shrink-0">
          {/* Contêiner estável: a <img> nunca troca de pai (não remonta ao chegar os dados) */}
          <div className="group/art relative size-[136px] overflow-hidden rounded-2xl bg-secondary shadow-[0_30px_60px_-30px_rgb(0_0_0_/_0.9)] transition-transform duration-500 ease-out-soft has-[a:hover]:scale-[1.02] md:size-[300px] lg:size-[450px]">
            {art}
            {slide && (
              <Link
                to="/nft/$nftId"
                params={{ nftId: slide.id }}
                aria-label={`Ver ${slide.name}`}
                className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              />
            )}
          </div>
          {/* Mobile: miniatura do próximo destaque sobreposta, como no frame */}
          {slides.length > 1 && (
            <img
              src={slides[(current + 1) % slides.length].images[0]}
              alt=""
              width={120}
              height={120}
              loading="lazy"
              className="absolute -bottom-2 -left-4 size-14 rounded-xl border-2 border-card object-cover md:hidden"
            />
          )}
        </div>
      </div>

      <div className="relative mt-3 flex justify-center md:hidden">{dots}</div>
    </section>
  )
}
