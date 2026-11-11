import type { NftListParams } from '@/api/contracts'
import { NftCard, NftCardSkeleton } from '@/components/catalog/nft-card'
import { useNftList } from '@/hooks/use-nfts'

interface NftRailProps {
  title: string
  params: NftListParams
  /** Item a omitir (ex.: o próprio NFT no detalhe). */
  excludeId?: string
  testId?: string
}

const RAIL_SIZE = 5

/**
 * Vitrine horizontal de 5 cards ("Mais desta coleção", "Colecionadores também
 * viram"). Em telas estreitas vira carrossel com scroll-snap.
 */
export function NftRail({ title, params, excludeId, testId }: NftRailProps) {
  const { data, isLoading } = useNftList({ ...params, pageSize: RAIL_SIZE + 1 })
  const items = (data?.items ?? []).filter((nft) => nft.id !== excludeId).slice(0, RAIL_SIZE)
  if (!isLoading && items.length === 0) return null

  return (
    <section aria-label={title} data-testid={testId} className="mt-20">
      <h2 className="border-b border-rule pb-3 text-base font-bold text-accent">{title}</h2>
      <ul className="no-scrollbar -mx-4 mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-5">
        {isLoading
          ? Array.from({ length: RAIL_SIZE }, (_, index) => (
              <li key={index} className="w-[44%] shrink-0 snap-start md:w-auto">
                <NftCardSkeleton />
              </li>
            ))
          : items.map((nft, index) => (
              <li key={nft.id} className="w-[44%] shrink-0 snap-start md:w-auto">
                <NftCard nft={nft} index={index} />
              </li>
            ))}
      </ul>
    </section>
  )
}
