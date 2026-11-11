import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchBoxProps {
  /** Valor atual refletido na URL. */
  value: string
  /** Aplicado após 300ms de inatividade. */
  onApply: (value: string) => void
  /** `header`: campo compacto do header desktop; `bar`: barra do topo mobile. */
  variant?: 'header' | 'bar'
  placeholder?: string
  autoFocus?: boolean
  className?: string
  onEscape?: () => void
}

export function SearchBox({ value, onApply, variant = 'header', placeholder = 'Buscar NFTs…', autoFocus, className, onEscape }: SearchBoxProps) {
  const [draft, setDraft] = useState(value)
  const [applied, setApplied] = useState(value)

  // Sincroniza com mudanças externas (limpar filtros, voltar/avançar no histórico).
  if (value !== applied) {
    setApplied(value)
    setDraft(value)
  }

  useEffect(() => {
    if (draft === value) return
    const timer = window.setTimeout(() => onApply(draft), 300)
    return () => window.clearTimeout(timer)
  }, [draft, value, onApply])

  return (
    <div
      role="search"
      className={cn(
        'relative flex items-center',
        variant === 'bar' ? 'h-11 rounded-lg bg-card' : 'h-9 rounded-sm border border-rule bg-background/60',
        'transition-[border-color,box-shadow] duration-200 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent',
        variant === 'bar' && 'border border-transparent',
        className,
      )}
    >
      <label htmlFor="search-input" className="sr-only">
        Buscar NFTs por nome, coleção ou criador
      </label>
      <Search
        className={cn('pointer-events-none absolute top-1/2 -translate-y-1/2 text-tan', variant === 'bar' ? 'left-3.5 size-5' : 'left-2.5 size-4')}
        aria-hidden="true"
      />
      <input
        id="search-input"
        data-testid="search-input"
        type="search"
        autoComplete="off"
        autoFocus={autoFocus}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onEscape?.()
        }}
        placeholder={placeholder}
        className={cn(
          'h-full w-full bg-transparent pr-3 text-foreground outline-none placeholder:text-tan [&::-webkit-search-cancel-button]:appearance-none',
          variant === 'bar' ? 'pl-11 text-[15px]' : 'pl-8 text-sm',
        )}
      />
    </div>
  )
}
