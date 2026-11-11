import { Link } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Estado vazio do carrinho, com atalho para o catálogo. */
export function CartEmptyState() {
  return (
    <div data-testid="cart-empty" className="flex animate-rise flex-col items-center justify-center gap-4 bg-card px-6 py-16 text-center">
      <span className="flex size-20 animate-float items-center justify-center rounded-full bg-tile text-accent">
        <ShoppingCart className="size-9" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-bold text-foreground">Seu carrinho está vazio</h2>
      <p className="max-w-sm text-sm text-muted-foreground">Explore o catálogo e adicione NFTs das suas edições favoritas para começar a comprar.</p>
      <Button asChild>
        <Link to="/" search={{}}>
          Explorar NFTs
        </Link>
      </Button>
    </div>
  )
}
