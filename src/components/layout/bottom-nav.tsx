import { Link, useRouterState } from '@tanstack/react-router'
import { Heart, House, ScanLine, ShoppingCart, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { useCartCount } from '@/hooks/use-cart'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib/utils'
import { CartCountBadge } from './header'

const item =
  'relative flex h-full flex-1 items-center justify-center text-primary/80 transition-[color,transform] duration-200 active:scale-90 data-[active=true]:text-accent'

/**
 * Barra de navegação inferior do layout mobile (frame "Início"): início,
 * favoritos, ação central em destaque, carrinho e conta.
 */
export function BottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { data: user } = useSession()
  const cartCount = useCartCount()
  const onAccount = pathname === '/profile' || pathname === '/wallets'

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 flex h-[72px] items-stretch rounded-t-[28px] bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_30px_-10px_rgb(0_0_0_/_0.6)]"
    >
      <Link to="/" className={item} data-active={pathname === '/'} aria-label="Início" aria-current={pathname === '/' ? 'page' : undefined}>
        <House className="size-6" fill={pathname === '/' ? 'currentColor' : 'none'} aria-hidden="true" />
      </Link>
      <button
        type="button"
        className={cn(item, 'cursor-pointer')}
        aria-label="Lista de interesse"
        onClick={() => toast.info('A lista de interesse fica fora do escopo desta entrega. Use o coração nos NFTs para favoritar.')}
      >
        <Heart className="size-6" aria-hidden="true" />
      </button>

      <div className="relative flex-1">
        <Link
          to="/"
          hash="catalogo"
          aria-label="Explorar o mercado"
          className="cta-gradient absolute left-1/2 top-0 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-primary-foreground shadow-[0_10px_24px_-8px_rgb(210_138_76_/_0.7)] ring-[6px] ring-background transition-transform duration-200 active:scale-90"
        >
          <ScanLine className="size-7" aria-hidden="true" />
        </Link>
      </div>

      <Link
        to="/cart"
        className={item}
        data-testid="header-cart"
        aria-label={cartCount > 0 ? `Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}` : 'Carrinho'}
      >
        <span className="relative">
          <ShoppingCart className="size-6" aria-hidden="true" />
          <CartCountBadge count={cartCount} className="-right-2 -top-1.5" />
        </span>
      </Link>
      {user ? (
        <Link to="/profile" className={item} data-active={onAccount} data-testid="header-profile" aria-label={`Perfil de ${user.name}`}>
          <UserRound className="size-6" fill={onAccount ? 'currentColor' : 'none'} aria-hidden="true" />
        </Link>
      ) : (
        <Link to="/login" className={item} data-testid="header-login" aria-label="Entrar">
          <UserRound className="size-6" aria-hidden="true" />
        </Link>
      )}
    </nav>
  )
}
