import { Heart } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { isFavorite, useFavorites, useToggleFavorite } from '@/hooks/use-nfts'
import { getToken } from '@/lib/session'
import { cn } from '@/lib/utils'

interface LikeButtonProps {
  nftId: string
  /** Nome do NFT, usado no rótulo acessível. */
  label: string
  className?: string
  testId?: string
  /** Exibe o texto "Favoritar"/"Favoritado" ao lado do ícone (botão do detalhe). */
  withText?: boolean
}

/** Favorito com atualização otimista; visitante é redirecionado para o login. */
export function LikeButton({ nftId, label, className, testId, withText = false }: LikeButtonProps) {
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
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-busy={pending || undefined}
      aria-pressed={active}
      aria-label={active ? `Remover ${label} dos favoritos` : `Adicionar ${label} aos favoritos`}
      data-testid={testId}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 transition-[color,background-color,transform] duration-200 active:scale-90 disabled:cursor-progress',
        className,
      )}
    >
      {/* key = estado: o coração "pulsa" a cada alternância */}
      <Heart
        key={String(active)}
        className={cn('size-[18px] shrink-0', active && 'animate-pop fill-accent text-accent')}
        aria-hidden="true"
      />
      {withText && <span>{active ? 'Favoritado' : 'Favoritar'}</span>}
    </button>
  )
}
