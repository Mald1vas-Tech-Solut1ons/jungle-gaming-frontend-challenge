import { Link } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Estado vazio do carrinho, com atalho para o catálogo. */
export function CartEmptyState() {
  return (
    <div
      data-testid="cart-empty"
      className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-card/50 px-6 py-16 text-center"
    >
      <ShoppingCart className="size-10 text-muted-foreground" aria-hidden="true" />
      <h2 className="text-lg font-semibold text-foreground">Seu carrinho está vazio</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Explore o catálogo e adicione NFTs das suas edições favoritas para começar a comprar.
      </p>
      <Button asChild>
        <Link to="/" search={{}}>Explorar NFTs</Link>
      </Button>
    </div>
  )
}
