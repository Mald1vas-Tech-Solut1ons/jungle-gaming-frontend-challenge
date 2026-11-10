import { useId } from 'react'
import { X } from 'lucide-react'
import type { Chain, NftCategory, NftRarity } from '@/api/contracts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CATEGORY_LABELS, CHAIN_LABELS, RARITY_LABELS } from '@/lib/labels'
import { cn } from '@/lib/utils'

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as [NftCategory, string][]
const RARITY_OPTIONS = Object.entries(RARITY_LABELS) as [NftRarity, string][]
const CHAIN_OPTIONS = Object.entries(CHAIN_LABELS) as [Chain, string][]

interface ChipGroupProps<T extends string> {
  title: string
  options: [T, string][]
  selected: T[]
  testIdPrefix: string
  onToggle: (value: T) => void
}

function ChipGroup<T extends string>({ title, options, selected, testIdPrefix, onToggle }: ChipGroupProps<T>) {
  const titleId = useId()
  return (
    <div className="flex flex-col gap-2">
      <span id={titleId} className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </span>
      <div role="group" aria-labelledby={titleId} className="flex flex-wrap gap-1.5">
        {options.map(([value, label]) => {
          const isOn = selected.includes(value)
          return (
            <button
              key={value}
              type="button"
              data-testid={`${testIdPrefix}-${value}`}
              aria-pressed={isOn}
              onClick={() => onToggle(value)}
              className={cn(
                'cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-colors',
                isOn
                  ? 'border-primary bg-primary font-bold text-primary-foreground'
                  : 'border-border bg-card text-foreground hover:border-primary/60 hover:bg-surface',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface FilterBarProps {
  categories: NftCategory[]
  rarities: NftRarity[]
  chains: Chain[]
  activeCount: number
  /** Botão "Limpar filtros" visível fora do estado vazio (testid único na página). */
  showClear: boolean
  onToggleCategory: (value: NftCategory) => void
  onToggleRarity: (value: NftRarity) => void
  onToggleChain: (value: Chain) => void
  onClear: () => void
}

export function FilterBar({
  categories,
  rarities,
  chains,
  activeCount,
  showClear,
  onToggleCategory,
  onToggleRarity,
  onToggleChain,
  onClear,
}: FilterBarProps) {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Filtros</span>
          {activeCount > 0 && (
            <Badge variant="default" className="h-5 min-w-5 justify-center px-1.5 text-[10px]">
              {activeCount}
            </Badge>
          )}
        </div>
        {showClear && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            data-testid="clear-filters"
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden="true" />
            Limpar filtros
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:gap-x-8">
        <ChipGroup title="Categoria" options={CATEGORY_OPTIONS} selected={categories} testIdPrefix="filter-category" onToggle={onToggleCategory} />
        <ChipGroup title="Raridade" options={RARITY_OPTIONS} selected={rarities} testIdPrefix="filter-rarity" onToggle={onToggleRarity} />
        <ChipGroup title="Rede" options={CHAIN_OPTIONS} selected={chains} testIdPrefix="filter-chain" onToggle={onToggleChain} />
      </div>
    </div>
  )
}
