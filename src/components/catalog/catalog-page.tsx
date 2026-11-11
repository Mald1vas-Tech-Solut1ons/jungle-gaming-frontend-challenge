import { useCallback, useEffect, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { SlidersHorizontal } from 'lucide-react'
import type { Chain, NftCategory, NftRarity, NftSort } from '@/api/contracts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useIsDesktop, useIsMobile } from '@/hooks/use-media-query'
import { useNftList } from '@/hooks/use-nfts'
import { normalizeError } from '@/lib/api'
import { SORT_LABELS } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { FilterPanel } from './filter-bar'
import { FEATURED_PARAMS, HeroSection } from './hero'
import { FeaturedCard, MintJournal, PromoBanners } from './home-sections'
import { NftCard, NftCardSkeleton } from './nft-card'
import { Pagination } from './pagination'
import { SearchBox } from './search-box'
import { EmptyState, ErrorState } from './states'

const routeApi = getRouteApi('/')

const SORT_OPTIONS = Object.entries(SORT_LABELS) as [NftSort, string][]
const PAGE_SIZE = 12

type Tab = 'all' | 'new' | 'trending'
const TABS: [Tab, string][] = [
  ['all', 'Todos os NFTs'],
  ['new', 'Novos lançamentos'],
  ['trending', 'Em alta'],
]

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function scrollToCatalog() {
  document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function CatalogPage() {
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const isDesktop = useIsDesktop()
  const isMobile = useIsMobile()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const q = search.q ?? ''
  const categories = search.category ?? []
  const rarities = search.rarity ?? []
  const chains = search.chain ?? []
  const sort = search.sort ?? 'recent'
  const featured = search.featured === true
  const tab: Tab = featured ? 'new' : sort === 'popular' ? 'trending' : 'all'

  const { data, isFetching, error, refetch } = useNftList({
    q: q.trim() || undefined,
    category: categories,
    rarity: rarities,
    chain: chains,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    featured: featured || undefined,
    sort,
    page: search.page ?? 1,
    pageSize: PAGE_SIZE,
  })
  // Lançamentos em destaque (mesma query do hero — cache compartilhado)
  const { data: highlights } = useNftList(FEATURED_PARAMS)

  const applyQuery = useCallback(
    (value: string) => {
      void navigate({ search: (prev) => ({ ...prev, q: value, page: 1 }) })
    },
    [navigate],
  )

  const toggleCategory = (value: NftCategory) => {
    void navigate({ search: (prev) => ({ ...prev, category: toggleValue(prev.category ?? [], value), page: 1 }) })
  }
  const toggleRarity = (value: NftRarity) => {
    void navigate({ search: (prev) => ({ ...prev, rarity: toggleValue(prev.rarity ?? [], value), page: 1 }) })
  }
  const toggleChain = (value: Chain) => {
    void navigate({ search: (prev) => ({ ...prev, chain: toggleValue(prev.chain ?? [], value), page: 1 }) })
  }
  const applyPrice = (minPrice: string | undefined, maxPrice: string | undefined) => {
    void navigate({ search: (prev) => ({ ...prev, minPrice, maxPrice, page: 1 }) })
  }
  const changeSort = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, sort: value as NftSort, page: 1 }) })
  }
  const changeTab = (value: Tab) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        featured: value === 'new' ? true : undefined,
        sort: value === 'trending' ? 'popular' : prev.sort === 'popular' ? undefined : prev.sort,
        page: 1,
      }),
    })
  }
  const goToPage = (page: number) => {
    void navigate({ search: (prev) => ({ ...prev, page }) })
    scrollToCatalog()
  }
  const clearFilters = () => {
    void navigate({ search: () => ({}) })
  }

  // Página além do alcance (ex.: URL direta ?page=99): corrige para a primeira página.
  useEffect(() => {
    if (!isFetching && data && data.page > data.totalPages) {
      void navigate({ search: (prev) => ({ ...prev, page: 1 }) })
    }
  }, [data, isFetching, navigate])

  const activeFilterCount =
    (q.trim() !== '' ? 1 : 0) +
    categories.length +
    rarities.length +
    chains.length +
    (search.minPrice || search.maxPrice ? 1 : 0) +
    (featured ? 1 : 0) +
    (sort !== 'recent' ? 1 : 0)
  const hasActiveFilters = activeFilterCount > 0

  const loadingGrid = data === undefined && !error
  const isEmpty = data !== undefined && data.items.length === 0 && !isFetching

  const filterPanel = (
    <FilterPanel
      categories={categories}
      rarities={rarities}
      chains={chains}
      minPrice={search.minPrice}
      maxPrice={search.maxPrice}
      facets={data?.facets}
      showClear={hasActiveFilters && !isEmpty}
      onToggleCategory={toggleCategory}
      onToggleRarity={toggleRarity}
      onToggleChain={toggleChain}
      onApplyPrice={applyPrice}
      onClear={clearFilters}
    />
  )

  const filtersButton = (
    <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          data-testid="filters-open"
          aria-label={activeFilterCount > 0 ? `Filtros, ${activeFilterCount} ativos` : 'Filtros'}
          className={cn(
            'relative flex shrink-0 cursor-pointer items-center justify-center gap-2 font-bold transition-transform duration-200 active:scale-90',
            isMobile ? 'cta-gradient size-11 rounded-lg text-primary-foreground' : 'h-9 rounded-sm border border-primary px-3 text-sm text-accent',
          )}
        >
          <SlidersHorizontal className="size-5" aria-hidden="true" />
          {!isMobile && 'Filtros'}
          {activeFilterCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] text-background">
              {activeFilterCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side={isMobile ? 'bottom' : 'left'} className={cn('overflow-y-auto', isMobile ? 'max-h-[85svh] rounded-t-[28px]' : 'w-[340px]')}>
        <SheetHeader className="mb-6">
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription>Os resultados atualizam a cada seleção.</SheetDescription>
        </SheetHeader>
        {filterPanel}
      </SheetContent>
    </Sheet>
  )

  return (
    <div className="flex flex-col gap-10 md:gap-16">
      {isMobile && (
        <div className="flex items-center gap-3">
          <SearchBox variant="bar" value={q} onApply={applyQuery} placeholder="Explorar coleções" className="flex-1" />
          {filtersButton}
        </div>
      )}

      <HeroSection />

      <section id="catalogo" aria-labelledby="catalog-title" className="scroll-mt-24">
        <h2 id="catalog-title" className="sr-only">
          Catálogo de NFTs
        </h2>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-10">
          {isDesktop && (
            <aside aria-label="Filtros do catálogo" className="flex flex-col gap-10">
              <div className="bg-card px-4 py-6">{filterPanel}</div>
              <FeaturedCard nft={highlights?.items[3] ?? highlights?.items[0]} />
            </aside>
          )}

          <div className="min-w-0">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 md:mb-8">
              <div role="tablist" aria-label="Seleção do catálogo" className="flex items-center gap-4 overflow-x-auto no-scrollbar md:gap-6">
                {TABS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={tab === value}
                    data-testid={`catalog-tab-${value}`}
                    onClick={() => changeTab(value)}
                    className={cn(
                      'nav-underline shrink-0 cursor-pointer whitespace-nowrap pb-1 text-base transition-colors duration-200 md:text-sm',
                      tab === value ? 'font-bold text-accent' : 'text-foreground hover:text-accent',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                {!isMobile && !isDesktop && filtersButton}
                <span id="sort-label" className="text-sm text-foreground">
                  Ordenar por:
                </span>
                <Select value={sort} onValueChange={changeSort}>
                  <SelectTrigger
                    data-testid="sort-select"
                    aria-labelledby="sort-label"
                    className="h-8 w-auto gap-1.5 border-transparent px-1 font-bold hover:border-transparent focus:border-accent"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {SORT_OPTIONS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loadingGrid ? (
              <>
                <p className="sr-only" role="status">
                  Carregando catálogo…
                </p>
                <div data-testid="nft-grid" aria-busy="true" className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-8 md:gap-y-10">
                  {Array.from({ length: PAGE_SIZE }, (_, index) => (
                    <NftCardSkeleton key={index} />
                  ))}
                </div>
              </>
            ) : error && (!data || data.items.length === 0) ? (
              <ErrorState title="Não foi possível carregar o catálogo" message={normalizeError(error).message} onRetry={() => void refetch()} />
            ) : isEmpty ? (
              <EmptyState
                message={
                  hasActiveFilters
                    ? 'Nada corresponde à sua busca. Ajuste os termos ou remova alguns filtros.'
                    : 'Nenhum item disponível no catálogo agora. Volte em breve!'
                }
                onClear={clearFilters}
              />
            ) : (
              <>
                <div
                  data-testid="nft-grid"
                  aria-busy={isFetching}
                  className={cn(
                    'grid grid-cols-2 gap-x-3 gap-y-8 transition-opacity duration-300 md:grid-cols-3 md:gap-x-8 md:gap-y-10',
                    isFetching && 'opacity-60',
                  )}
                >
                  {data.items.map((nft, index) => (
                    <NftCard key={nft.id} nft={nft} index={index} priority={index === 0} />
                  ))}
                </div>
                {data.totalPages > 1 && <Pagination page={data.page} totalPages={data.totalPages} onSelect={goToPage} />}
                {data.totalPages <= 1 && (
                  <span data-testid="page-indicator" className="sr-only">
                    Página 1 de 1
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {!isMobile && (
        <>
          <PromoBanners nfts={highlights?.items.slice(1, 3) ?? []} />
          <MintJournal />
        </>
      )}
    </div>
  )
}
