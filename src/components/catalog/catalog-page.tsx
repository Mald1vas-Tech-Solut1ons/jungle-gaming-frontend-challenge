import { useCallback, useEffect } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { Chain, NftCategory, NftRarity, NftSort } from '@/api/contracts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useNftList } from '@/hooks/use-nfts'
import { normalizeError } from '@/lib/api'
import { SORT_LABELS } from '@/lib/labels'
import { EmptyState, ErrorState } from './states'
import { FilterBar } from './filter-bar'
import { HeroSection } from './hero'
import { NftCard, NftCardSkeleton } from './nft-card'
import { Pagination } from './pagination'
import { SearchBox } from './search-box'

const routeApi = getRouteApi('/')

const SORT_OPTIONS = Object.entries(SORT_LABELS) as [NftSort, string][]

const PAGE_SIZE = 12

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

export function CatalogPage() {
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()

  const q = search.q ?? ''
  const categories = search.category ?? []
  const rarities = search.rarity ?? []
  const chains = search.chain ?? []
  const sort = search.sort ?? 'recent'

  const { data, isFetching, error, refetch } = useNftList({
    q: q.trim() || undefined,
    category: categories,
    rarity: rarities,
    chain: chains,
    sort,
    page: search.page ?? 1,
    pageSize: PAGE_SIZE,
  })

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

  const changeSort = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, sort: value as NftSort, page: 1 }) })
  }

  const goToPage = (page: number) => {
    void navigate({ search: (prev) => ({ ...prev, page }) })
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

  const hasActiveFilters =
    q.trim() !== '' || categories.length > 0 || rarities.length > 0 || chains.length > 0 || sort !== 'recent'

  const activeFilterCount =
    (q.trim() !== '' ? 1 : 0) + categories.length + rarities.length + chains.length + (sort !== 'recent' ? 1 : 0)

  const loadingGrid = data === undefined && !error
  const isEmpty = data !== undefined && data.items.length === 0 && !isFetching

  return (
    <div className="flex flex-col gap-8">
      <HeroSection />

      <section id="catalogo" aria-labelledby="catalog-title" className="scroll-mt-24">
        <h2 id="catalog-title" className="display-title text-xl text-foreground">
          Catálogo
        </h2>

        <div className="mt-4 flex flex-col gap-4">
          <SearchBox value={q} onApply={applyQuery} />

          <div className="mt-2 flex flex-col gap-6 xl:flex-row xl:items-start">
            <aside
              aria-label="Filtros do catálogo"
              className="w-full shrink-0 rounded-xl bg-surface p-5 xl:sticky xl:top-24 xl:w-80"
            >
              <FilterBar
                categories={categories}
                rarities={rarities}
                chains={chains}
                activeCount={activeFilterCount}
                showClear={hasActiveFilters && !isEmpty}
                onToggleCategory={toggleCategory}
                onToggleRarity={toggleRarity}
                onToggleChain={toggleChain}
                onClear={clearFilters}
              />
              <div className="mt-5">
                <span id="sort-label" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Ordenar por
                </span>
                <Select value={sort} onValueChange={changeSort}>
                  <SelectTrigger data-testid="sort-select" aria-labelledby="sort-label">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              {loadingGrid ? (
                <>
                  <p className="sr-only" role="status">
                    Carregando catálogo…
                  </p>
                  <div data-testid="nft-grid" aria-busy="true" className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {Array.from({ length: PAGE_SIZE }, (_, index) => (
                      <NftCardSkeleton key={index} />
                    ))}
                  </div>
                </>
              ) : error && (!data || data.items.length === 0) ? (
                <ErrorState
                  title="Não foi possível carregar o catálogo"
                  message={normalizeError(error).message}
                  onRetry={() => void refetch()}
                />
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
                  <div data-testid="nft-grid" aria-busy={isFetching} className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {data.items.map((nft, index) => (
                      <NftCard key={nft.id} nft={nft} priority={index === 0} />
                    ))}
                  </div>
                  <Pagination
                    page={data.page}
                    totalPages={data.totalPages}
                    onPrev={() => goToPage(Math.max(1, data.page - 1))}
                    onNext={() => goToPage(Math.min(data.totalPages, data.page + 1))}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
