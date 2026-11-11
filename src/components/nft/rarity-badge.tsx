import type { NftRarity } from '@/api/contracts'
import { Badge } from '@/components/ui/badge'
import { RARITY_LABELS } from '@/lib/labels'

/** Badge de raridade no estilo Figma: fill âmbar, texto escuro, caixa alta. */
export function RarityBadge({ rarity, className }: { rarity: NftRarity; className?: string }) {
  return (
    <Badge variant="default" className={`text-[10px] font-bold uppercase tracking-wider ${className ?? ''}`}>
      {RARITY_LABELS[rarity]}
    </Badge>
  )
}
