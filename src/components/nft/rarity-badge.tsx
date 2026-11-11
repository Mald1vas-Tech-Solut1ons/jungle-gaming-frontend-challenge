import type { NftRarity } from '@/api/contracts'
import { RARITY_LABELS } from '@/lib/labels'
import { cn } from '@/lib/utils'

/** Etiqueta de raridade do layout: faixa âmbar reta, texto escuro em caixa alta. */
export function RarityBadge({ rarity, className }: { rarity: NftRarity; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-[26px] min-w-[68px] items-center bg-primary px-2.5 text-sm font-bold uppercase leading-none text-primary-foreground',
        className,
      )}
    >
      {RARITY_LABELS[rarity]}
    </span>
  )
}
