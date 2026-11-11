import { useId, useState } from 'react'
import { X } from 'lucide-react'
import type { Chain, NftCategory, NftFacets, NftRarity } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { CATEGORY_LABELS, CHAIN_LABELS, RARITY_LABELS } from '@/lib/labels'
import { cn } from '@/lib/utils'

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as [NftCategory, string][]
const RARITY_OPTIONS = Object.entries(RARITY_LABELS) as [NftRarity, string][]
const CHAIN_OPTIONS = Object.entries(CHAIN_LABELS) as [Chain, string][]

interface OptionListProps<T extends string> {
  title: string
  options: [T, string][]
  selected: T[]
  counts?: Record<T, number>
  testIdPrefix: string
  onToggle: (value: T) => void
}

/** Lista de opções do layout: rótulo à esquerda, contagem entre parênteses à direita. */
function OptionList<T extends string>({ title, options, selected, counts, testIdPrefix, onToggle }: OptionListProps<T>) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId}>
      <h3 id={titleId} className="text-base font-bold text-foreground">
        {title}
      </h3>
      <ul className="mt-3 flex flex-col">
        {options.map(([value, label]) => {
          const isOn = selected.includes(value)
          return (
            <li key={value}>
              <button
                type="button"
                data-testid={`${testIdPrefix}-${value}`}
                aria-pressed={isOn}
                onClick={() => onToggle(value)}
                className={cn(
                  'group/option relative flex h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-sm px-3 text-left text-sm transition-[background-color,color,padding] duration-200',
                  isOn ? 'bg-tile pl-4 font-bold text-accent' : 'text-primary hover:bg-tile/70 hover:pl-4 hover:text-accent',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 bg-accent transition-transform duration-200',
                    isOn ? 'scale-y-100' : 'scale-y-0',
                  )}
                />
                <span className="truncate">{label}</span>
                {/* Estado selecionado não depende só de cor: marcador + peso + aria-pressed */}
                <span className={cn('shrink-0 tabular-nums', isOn ? 'text-accent' : 'text-muted-foreground')}>({counts ? counts[value] : '–'})</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const priceFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const STEP = 0.01

interface PriceRangeProps {
  /** Limites do catálogo (strings decimais vindas da API). */
  bounds: { min: string; max: string } | undefined
  minPrice: string | undefined
  maxPrice: string | undefined
  onApply: (min: string | undefined, max: string | undefined) => void
}

/** Faixa de preço com dois controles; só vai para a URL ao clicar em "Aplicar". */
function PriceRange({ bounds, minPrice, maxPrice, onApply }: PriceRangeProps) {
  const titleId = useId()
  const floor = bounds ? Math.floor(Number(bounds.min) * 100) / 100 : 0
  const ceil = bounds ? Math.ceil(Number(bounds.max) * 100) / 100 : 0
  const appliedLow = minPrice !== undefined ? Number(minPrice) : floor
  const appliedHigh = maxPrice !== undefined ? Number(maxPrice) : ceil

  const [draft, setDraft] = useState<{ low: number; high: number } | null>(null)
  // Sincroniza o rascunho quando a URL ou os limites mudam (limpar filtros, histórico).
  const syncKey = `${minPrice ?? ''}|${maxPrice ?? ''}|${floor}|${ceil}`
  const [lastKey, setLastKey] = useState(syncKey)
  if (lastKey !== syncKey) {
    setLastKey(syncKey)
    setDraft(null)
  }

  const low = Math.min(Math.max(draft?.low ?? appliedLow, floor), ceil)
  const high = Math.max(Math.min(draft?.high ?? appliedHigh, ceil), low)
  const span = ceil - floor || 1
  const dirty = draft !== null && (draft.low !== appliedLow || draft.high !== appliedHigh)
  const disabled = !bounds || ceil <= floor

  return (
    <section aria-labelledby={titleId}>
      <h3 id={titleId} className="text-base font-bold text-foreground">
        Faixa de preço
      </h3>
      <div className="relative mt-3 h-6 px-2">
        <div className="absolute inset-x-2 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-secondary" />
        <div
          className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-primary"
          style={{ left: `calc(0.5rem + (100% - 1rem) * ${(low - floor) / span})`, right: `calc(0.5rem + (100% - 1rem) * ${(ceil - high) / span})` }}
        />
        <input
          type="range"
          className="range-thumb absolute inset-x-0 top-0 h-6 w-full"
          aria-label="Preço mínimo em ETH"
          data-testid="price-min"
          min={floor}
          max={ceil}
          step={STEP}
          value={low}
          disabled={disabled}
          onChange={(event) => setDraft({ low: Math.min(event.target.valueAsNumber, high), high })}
        />
        <input
          type="range"
          className="range-thumb absolute inset-x-0 top-0 h-6 w-full"
          aria-label="Preço máximo em ETH"
          data-testid="price-max"
          min={floor}
          max={ceil}
          step={STEP}
          value={high}
          disabled={disabled}
          onChange={(event) => setDraft({ low, high: Math.max(event.target.valueAsNumber, low) })}
        />
      </div>
      <p className="mt-3 px-3 text-sm text-foreground" aria-live="polite" data-testid="price-label">
        Preço: {priceFormat.format(low)} – {priceFormat.format(high)} ETH
      </p>
      <Button
        type="button"
        size="sm"
        className="ml-3 mt-3 h-9 px-3 text-sm"
        disabled={disabled || !dirty}
        data-testid="price-apply"
        onClick={() => {
          onApply(low > floor ? low.toFixed(2) : undefined, high < ceil ? high.toFixed(2) : undefined)
          setDraft(null)
        }}
      >
        Aplicar
      </Button>
    </section>
  )
}

export interface FilterPanelProps {
  categories: NftCategory[]
  rarities: NftRarity[]
  chains: Chain[]
  minPrice: string | undefined
  maxPrice: string | undefined
  facets: NftFacets | undefined
  /** Botão "Limpar filtros" visível fora do estado vazio (testid único na página). */
  showClear: boolean
  onToggleCategory: (value: NftCategory) => void
  onToggleRarity: (value: NftRarity) => void
  onToggleChain: (value: Chain) => void
  onApplyPrice: (min: string | undefined, max: string | undefined) => void
  onClear: () => void
  className?: string
}

/** Painel de filtros do catálogo: sidebar no desktop, gaveta em telas menores. */
export function FilterPanel({
  categories,
  rarities,
  chains,
  minPrice,
  maxPrice,
  facets,
  showClear,
  onToggleCategory,
  onToggleRarity,
  onToggleChain,
  onApplyPrice,
  onClear,
  className,
}: FilterPanelProps) {
  return (
    <div className={cn('flex flex-col gap-8', className)}>
      <OptionList
        title="Coleções"
        options={CATEGORY_OPTIONS}
        selected={categories}
        counts={facets?.category}
        testIdPrefix="filter-category"
        onToggle={onToggleCategory}
      />
      <PriceRange bounds={facets?.price} minPrice={minPrice} maxPrice={maxPrice} onApply={onApplyPrice} />
      <OptionList
        title="Raridade"
        options={RARITY_OPTIONS}
        selected={rarities}
        counts={facets?.rarity}
        testIdPrefix="filter-rarity"
        onToggle={onToggleRarity}
      />
      <OptionList title="Rede" options={CHAIN_OPTIONS} selected={chains} counts={facets?.chain} testIdPrefix="filter-chain" onToggle={onToggleChain} />
      {showClear && (
        <Button type="button" variant="outline" size="sm" onClick={onClear} data-testid="clear-filters" className="animate-fade self-start">
          <X aria-hidden="true" />
          Limpar filtros
        </Button>
      )}
    </div>
  )
}
