import { SearchX, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  message: string
  onClear: () => void
}

export function EmptyState({ message, onClear }: EmptyStateProps) {
  return (
    <div data-testid="empty-state" className="flex animate-rise flex-col items-center justify-center gap-3 bg-card px-6 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-tile text-accent">
        <SearchX className="size-7" aria-hidden="true" />
      </span>
      <h3 className="text-lg font-bold">Nenhum NFT encontrado</h3>
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
      className="flex animate-rise flex-col items-center justify-center gap-3 border-l-4 border-destructive bg-card px-6 py-16 text-center"
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-tile text-destructive">
        <WifiOff className="size-7" aria-hidden="true" />
      </span>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      <Button type="button" onClick={onRetry} data-testid="retry-button">
        Tentar novamente
      </Button>
    </div>
  )
}
