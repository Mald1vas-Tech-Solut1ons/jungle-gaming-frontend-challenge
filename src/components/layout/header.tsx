import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { LogIn, LogOut, Menu, Search, ShoppingCart, UserRound, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useCartCount } from '@/hooks/use-cart'
import { useLogout, useSession } from '@/hooks/use-session'
import { cn } from '@/lib/utils'

function Logo() {
  return (
    <Link to="/" className="flex items-center" aria-label="Kurio Marketplace — início" data-testid="header-logo">
      <img src="/logo.svg" alt="Kurio" width={200} height={50} />
    </Link>
  )
}

function NavLinks({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const { data: user } = useSession()
  const logout = useLogout()
  const cartCount = useCartCount()
  return (
    <nav className={cn('flex items-center gap-1', className)} aria-label="Navegação principal">
      <Link to="/" className="rounded-md px-3 py-2 text-sm font-medium hover:text-accent" activeProps={{ className: 'text-accent' }} onClick={onNavigate}>
        Inicio
      </Link>
      <Link
        to="/"
        hash="catalogo"
        className="rounded-md px-3 py-2 text-sm font-medium hover:text-accent"
        activeOptions={{ exact: true }}
        onClick={onNavigate}
      >
        Mercado
      </Link>
      {['Criadores', 'Aprenda'].map((label) => (
        <button
          key={label}
          type="button"
          className="cursor-pointer rounded-md px-3 py-2 text-sm font-medium hover:text-accent"
          onClick={() => {
            toast.info(`“${label}” é uma página editorial fora do escopo desta entrega.`)
            onNavigate?.()
          }}
        >
          {label}
        </button>
      ))}
      <Link
        to="/cart"
        className="relative ml-2 rounded-md p-2 text-accent hover:bg-surface"
        onClick={onNavigate}
        data-testid="header-cart"
        aria-label={`Carrinho${cartCount > 0 ? `, ${cartCount} itens` : ''}`}
      >
        <ShoppingCart className="size-5" aria-hidden="true" />
        {cartCount > 0 && (
          <span
            data-testid="cart-count"
            className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
            aria-hidden="true"
          >
            {cartCount}
          </span>
        )}
      </Link>
      <Link
        to="/"
        hash="catalogo"
        className="rounded-md p-2 text-foreground hover:bg-surface"
        aria-label="Buscar NFTs"
        onClick={onNavigate}
      >
        <Search className="size-5" aria-hidden="true" />
      </Link>
      {user ? (
        <>
          <Link
            to="/profile"
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium hover:text-accent"
            activeProps={{ className: 'text-accent' }}
            onClick={onNavigate}
            data-testid="header-profile"
          >
            <UserRound className="size-4" aria-hidden="true" />
            Perfil
          </Link>
          <Link
            to="/wallets"
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium hover:text-accent"
            activeProps={{ className: 'text-accent' }}
            onClick={onNavigate}
            data-testid="header-wallets"
          >
            <Wallet className="size-4" aria-hidden="true" />
            Carteiras
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout.mutate()}
            isPending={logout.isPending}
            className="flex items-center gap-1.5"
            data-testid="header-logout"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sair
          </Button>
        </>
      ) : (
        <Button asChild size="sm" className="ml-3" data-testid="header-login">
          <Link to="/login" onClick={onNavigate}>
            <LogIn className="size-4" aria-hidden="true" />
            Entrar
          </Link>
        </Button>
      )}
    </nav>
  )
}

export function Header() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-[90px] w-full max-w-[1200px] items-center justify-between gap-4 px-4 xl:px-0">
        <Logo />
        <div className="hidden items-center lg:flex">
          <NavLinks />
        </div>
        <div className="lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Abrir menu" data-testid="header-menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <NavLinks className="mt-4 flex-col items-start" onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
