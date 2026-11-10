import { createFileRoute } from '@tanstack/react-router'
import { NftDetailPage } from '@/components/nft/detail-page'

export const Route = createFileRoute('/nft/$nftId')({
  component: NftDetailRoute,
})

function NftDetailRoute() {
  const { nftId } = Route.useParams()
  // key remonta o estado (galeria/edição/quantidade) ao trocar de NFT
  return <NftDetailPage key={nftId} nftId={nftId} />
}
