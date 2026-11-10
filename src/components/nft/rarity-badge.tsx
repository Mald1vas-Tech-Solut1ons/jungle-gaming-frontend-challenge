import type { NftRarity } from '@/api/contracts'
import { Badge } from '@/components/ui/badge'
import { RARITY_LABELS } from '@/lib/labels'

const RARITY_VARIANTS: Record<NftRarity, 'default' | 'secondary' | 'warning' | 'outline'> = {
  common: 'outline',
  rare: 'secondary',
  epic: 'warning',
  legendary: 'default',
}

export function RarityBadge({ rarity, className }: { rarity: NftRarity; className?: string }) {
  return (
    <Badge variant={RARITY_VARIANTS[rarity]} className={className}>
      {RARITY_LABELS[rarity]}
    </Badge>
  )
}
