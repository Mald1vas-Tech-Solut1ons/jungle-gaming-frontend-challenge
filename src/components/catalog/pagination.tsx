import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
  onSelect: (page: number) => void
}

const square =
  'flex size-8 cursor-pointer items-center justify-center rounded-sm border border-rule text-sm text-foreground transition-[background-color,color,border-color,transform] duration-200 hover:border-primary hover:text-accent active:scale-90 disabled:pointer-events-none disabled:opacity-35'

/** Janela de até 5 páginas em torno da atual. */
function pageWindow(page: number, totalPages: number): number[] {
  const size = Math.min(5, totalPages)
  const start = Math.max(1, Math.min(page - 2, totalPages - size + 1))
  return Array.from({ length: size }, (_, index) => start + index)
}

/** Paginação numerada do layout (quadrados; página atual preenchida). */
export function Pagination({ page, totalPages, onSelect }: PaginationProps) {
  return (
    <nav aria-label="Paginação do catálogo" className="mt-12 flex items-center justify-end gap-2">
      <span data-testid="page-indicator" aria-live="polite" className="sr-only">
        Página {page} de {totalPages}
      </span>
      <button
        type="button"
        className={square}
        onClick={() => onSelect(page - 1)}
        disabled={page <= 1}
        data-testid="pagination-prev"
        aria-label="Página anterior"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      {pageWindow(page, totalPages).map((value) => {
        const current = value === page
        return (
          <button
            key={value}
            type="button"
            aria-label={`Página ${value}`}
            aria-current={current ? 'page' : undefined}
            data-testid={`pagination-page-${value}`}
            onClick={() => onSelect(value)}
            className={cn(square, current && 'border-primary bg-primary font-bold text-primary-foreground hover:text-primary-foreground')}
          >
            {value}
          </button>
        )
      })}
      <button
        type="button"
        className={square}
        onClick={() => onSelect(page + 1)}
        disabled={page >= totalPages}
        data-testid="pagination-next"
        aria-label="Próxima página"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  )
}
