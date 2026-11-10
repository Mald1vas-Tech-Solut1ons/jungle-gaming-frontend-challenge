import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  page: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}

export function Pagination({ page, totalPages, onPrev, onNext }: PaginationProps) {
  return (
    <nav aria-label="Paginação" className="mt-6 flex items-center justify-center gap-3">
      <Button type="button" variant="outline" size="sm" onClick={onPrev} disabled={page <= 1} data-testid="pagination-prev">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Anterior
      </Button>
      <span data-testid="page-indicator" aria-live="polite" className="text-sm text-muted-foreground">
        Página {page} de {totalPages}
      </span>
      <Button type="button" variant="outline" size="sm" onClick={onNext} disabled={page >= totalPages} data-testid="pagination-next">
        Próxima
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>
    </nav>
  )
}
