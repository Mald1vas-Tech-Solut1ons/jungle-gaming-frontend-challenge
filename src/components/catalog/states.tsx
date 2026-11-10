import { SearchX, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  message: string
  onClear: () => void
}

export function EmptyState({ message, onClear }: EmptyStateProps) {
  return (
    <div
      data-testid="empty-state"
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center"
    >
      <SearchX className="size-10 text-muted-foreground" aria-hidden="true" />
      <h3 className="text-lg font-semibold">Nenhum NFT encontrado</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      <Button type="button" variant="outline" onClick={onClear} data-testid="clear-filters">
        Limpar filtros
      </Button>
    </div>
  )
}

interface ErrorStateProps {
  title: string
  message: string
  onRetry: () => void
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  return (
    <div
      data-testid="error-state"
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/40 bg-card px-6 py-16 text-center"
    >
      <WifiOff className="size-10 text-destructive" aria-hidden="true" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      <Button type="button" variant="outline" onClick={onRetry} data-testid="retry-button">
        Tentar novamente
      </Button>
    </div>
  )
}
