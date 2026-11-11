import { useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { LogIn, LogOut, Search, ShoppingCart, X } from 'lucide-react'
import { toast } from 'sonner'
import { SearchBox } from '@/components/catalog/search-box'
import { Button } from '@/components/ui/button'
import { useCartCount } from '@/hooks/use-cart'
import { useCatalogSearch } from '@/hooks/use-catalog-search'
import { useLogout, useSession } from '@/hooks/use-session'
import { cn } from '@/lib/utils'

/** Wordmark em texto, como no layout (Roboto Mono bold com tracking). */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="Kurio — página inicial"
      data-testid="header-logo"
      className={cn('logo-kurio text-sm text-foreground transition-colors duration-200 hover:text-accent', className)}
    >
      Kurio
    </Link>
  )
}

const navLink =
  'nav-underline flex h-full items-center text-base text-foreground transition-colors duration-200 hover:text-accent data-[active=true]:font-bold data-[active=true]:text-accent'

function outOfScope(label: string) {
  toast.info(`“${label}” é uma página editorial fora do escopo desta entrega.`)
}

/** Contador do carrinho: reanima a cada mudança de quantidade (key = valor). */
export function CartCountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      key={count}
      data-testid="cart-count"
      aria-hidden="true"
      className={cn(
        'absolute flex h-4 min-w-4 animate-pop items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold leading-none text-accent-foreground',
        className,
      )}
    >
      {count}
    </span>
  )
}

/** Header desktop/tablet (≥ 768px). No mobile cada tela tem a própria barra. */
export function Header() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { data: user } = useSession()
  const logout = useLogout()
  const cartCount = useCartCount()
  const { q, apply } = useCatalogSearch()
  const [searchToggled, setSearchToggled] = useState(false)
  const searchOpen = searchToggled || q !== ''

  const inMarket = /^\/(nft|cart|checkout)/.test(pathname)
  const firstName = user?.name.split(' ')[0]

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md">
      <div className="page-container">
        <div className="flex h-[69px] items-center gap-4 border-b border-rule lg:gap-6">
          <Logo className="shrink-0" />

          <nav aria-label="Navegação principal" className="flex h-full flex-1 items-center justify-center gap-5 lg:gap-10">
            <Link to="/" className={navLink} data-active={!inMarket} aria-current={pathname === '/' ? 'page' : undefined}>
              Início
            </Link>
            <Link to="/" hash="catalogo" className={navLink} data-active={inMarket}>
              Mercado
            </Link>
            <button type="button" className={cn(navLink, 'cursor-pointer')} onClick={() => outOfScope('Criadores')}>
              Criadores
            </button>
            <button type="button" className={cn(navLink, 'cursor-pointer')} onClick={() => outOfScope('Aprenda')}>
              Aprenda
            </button>
          </nav>

          <div className="flex shrink-0 items-center gap-3 lg:gap-5">
            <div className="flex items-center">
              <div
                className={cn(
                  'overflow-hidden transition-[width,opacity,margin] duration-300 ease-out-soft',
                  searchOpen ? 'mr-2 w-40 opacity-100 lg:w-56' : 'w-0 opacity-0',
                )}
              >
                {searchOpen && (
                  <SearchBox
                    value={q}
                    onApply={apply}
                    autoFocus={searchToggled}
                    onEscape={() => {
                      setSearchToggled(false)
                      if (q !== '') apply('')
                    }}
                  />
                )}
              </div>
              <button
                type="button"
                data-testid="header-search"
                aria-label={searchOpen ? 'Fechar busca' : 'Buscar NFTs'}
                aria-expanded={searchOpen}
                onClick={() => {
                  if (searchOpen) {
                    setSearchToggled(false)
                    if (q !== '') apply('')
                  } else {
                    setSearchToggled(true)
                  }
                }}
                className="flex size-9 cursor-pointer items-center justify-center rounded-sm text-foreground transition-[color,transform] duration-200 hover:scale-110 hover:text-accent"
              >
                {searchOpen ? <X className="size-5" aria-hidden="true" /> : <Search className="size-6" aria-hidden="true" />}
              </button>
            </div>

            <Link
              to="/cart"
              data-testid="header-cart"
              aria-label={cartCount > 0 ? `Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}` : 'Carrinho'}
              className="relative flex size-9 items-center justify-center rounded-sm text-foreground transition-[color,transform] duration-200 hover:scale-110 hover:text-accent"
            >
              <ShoppingCart className="size-6" aria-hidden="true" />
              <CartCountBadge count={cartCount} className="-right-0.5 top-0" />
            </Link>

            {user ? (
              <div className="flex items-center gap-1">
                <Link
                  to="/profile"
                  data-testid="header-profile"
                  aria-label={`Perfil de ${user.name}`}
                  className="flex h-[35px] items-center gap-2 rounded-md border border-primary px-2.5 font-bold text-accent transition-colors duration-200 hover:bg-primary/10"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-5 items-center justify-center overflow-hidden rounded-full bg-primary text-[11px] text-primary-foreground"
                  >
                    {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-full object-cover" /> : user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-24 truncate">{firstName}</span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  onClick={() => logout.mutate()}
                  isPending={logout.isPending}
                  aria-label="Sair da conta"
                  data-testid="header-logout"
                >
                  {!logout.isPending && <LogOut aria-hidden="true" />}
                </Button>
              </div>
            ) : (
              <Button asChild className="h-[35px] px-2.5 text-base [&_svg]:size-5" data-testid="header-login">
                <Link to="/login">
                  <LogIn className="size-5" aria-hidden="true" />
                  Entrar
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
