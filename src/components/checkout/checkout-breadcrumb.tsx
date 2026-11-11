import { Link } from '@tanstack/react-router'

/** Trilha "Início / Mercado / <tela>" do carrinho e do pagamento. */
export function CheckoutBreadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Trilha de navegação" className="mb-5 text-sm font-bold text-foreground">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link to="/" className="transition-colors duration-200 hover:text-accent">
            Início
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link to="/" hash="catalogo" className="transition-colors duration-200 hover:text-accent">
            Mercado
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page">{current}</li>
      </ol>
    </nav>
  )
}
