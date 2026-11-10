import { Heart } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { isFavorite, useFavorites, useToggleFavorite } from '@/hooks/use-nfts'
import { getToken } from '@/lib/session'
import { cn } from '@/lib/utils'

interface LikeButtonProps {
  nftId: string
  /** Nome do NFT, usado no rótulo acessível. */
  label: string
  className?: string
  testId?: string
}

/** Favorito com atualização otimista; visitante é redirecionado para o login. */
export function LikeButton({ nftId, label, className, testId }: LikeButtonProps) {
  const navigate = useNavigate()
  const { data: favorites } = useFavorites()
  const toggle = useToggleFavorite()
  const active = isFavorite(nftId, favorites)
  const pending = toggle.isPending && toggle.variables?.nftId === nftId

  const handleClick = () => {
    if (!getToken()) {
      void navigate({ to: '/login', search: { redirect: window.location.pathname } })
      return
    }
    toggle.mutate({ nftId, active })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleClick}
      isPending={pending}
      aria-pressed={active}
      aria-label={active ? `Remover ${label} dos favoritos` : `Adicionar ${label} aos favoritos`}
      data-testid={testId}
      className={className}
    >
      <Heart className={cn('size-4', active && 'fill-primary text-primary')} aria-hidden="true" />
    </Button>
  )
}
