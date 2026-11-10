import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SearchBoxProps {
  /** Valor atual refletido na URL. */
  value: string
  /** Aplicado após 300ms de inatividade. */
  onApply: (value: string) => void
}

export function SearchBox({ value, onApply }: SearchBoxProps) {
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
    <div className="relative">
      <Label htmlFor="search-input" className="sr-only">
        Buscar NFTs
      </Label>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        id="search-input"
        data-testid="search-input"
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Buscar por nome, coleção ou artista"
        className="pl-9"
      />
    </div>
  )
}
