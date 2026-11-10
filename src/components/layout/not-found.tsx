import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

/** Rota inexistente (fallback global do router). */
export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="display-title text-primary">404</p>
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <p className="max-w-md text-sm text-muted-foreground">A rota que você tentou acessar não existe ou o recurso não está disponível.</p>
      <Button asChild variant="outline">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  )
}
