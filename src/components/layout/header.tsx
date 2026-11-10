import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Leaf, LogIn, LogOut, Menu, UserRound, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useCartCount } from '@/hooks/use-cart'
import { useLogout, useSession } from '@/hooks/use-session'
import { cn } from '@/lib/utils'

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="Jungle Marketplace — início" data-testid="header-logo">
      <Leaf className="size-6 text-primary" aria-hidden="true" />
      <span className="display-title text-foreground">
        Jungle<span className="text-primary">.</span>
      </span>
    </Link>
  )
}

function NavLinks({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const { data: user } = useSession()
  const logout = useLogout()
  const cartCount = useCartCount()
  return (
    <nav className={cn('flex items-center gap-1', className)} aria-label="Navegação principal">
      <Link to="/" className="rounded-md px-3 py-2 text-sm hover:bg-surface" activeProps={{ className: 'text-primary' }} onClick={onNavigate}>
        Início
      </Link>
      <Link
        to="/cart"
        className="relative rounded-md px-3 py-2 text-sm hover:bg-surface"
        activeProps={{ className: 'text-primary' }}
        onClick={onNavigate}
        data-testid="header-cart"
      >
        Carrinho
        {cartCount > 0 && (
          <span
            data-testid="cart-count"
            className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
            aria-label={`${cartCount} itens no carrinho`}
          >
            {cartCount}
          </span>
        )}
      </Link>
      {user ? (
        <>
          <Link
            to="/profile"
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm hover:bg-surface"
            activeProps={{ className: 'text-primary' }}
            onClick={onNavigate}
            data-testid="header-profile"
          >
            <UserRound className="size-4" aria-hidden="true" />
            Perfil
          </Link>
          <Link
            to="/wallets"
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm hover:bg-surface"
            activeProps={{ className: 'text-primary' }}
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
        <Button asChild variant="outline" size="sm" data-testid="header-login">
          <Link to="/login" className="flex items-center gap-1.5" onClick={onNavigate}>
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
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <div className="hidden items-center md:flex">
          <NavLinks />
        </div>
        <div className="md:hidden">
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
