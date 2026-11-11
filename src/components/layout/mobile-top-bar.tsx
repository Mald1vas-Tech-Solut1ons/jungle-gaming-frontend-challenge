import type { ReactNode } from 'react'
import { useCanGoBack, useRouter } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Botão circular das barras mobile (voltar, favoritar, carrinho). */
export const roundButton =
  'flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-rule bg-tile text-accent transition-[background-color,transform] duration-200 hover:bg-secondary active:scale-90'

/** Volta no histórico; em acesso direto (sem histórico) vai para `fallback`. */
export function BackButton({ fallback = '/', className }: { fallback?: string; className?: string }) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  return (
    <button
      type="button"
      aria-label="Voltar"
      data-testid="mobile-back"
      className={cn(roundButton, className)}
      onClick={() => {
        if (canGoBack) router.history.back()
        else void router.navigate({ to: fallback })
      }}
    >
      <ChevronLeft className="size-5" aria-hidden="true" />
    </button>
  )
}

interface MobileTopBarProps {
  title: string
  fallback?: string
  action?: ReactNode
}

/** Barra de topo das telas mobile internas: voltar + título centralizado. */
export function MobileTopBar({ title, fallback, action }: MobileTopBarProps) {
  return (
    <div className="mb-5 grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-2 pt-1">
      <BackButton fallback={fallback} />
      <h1 className="truncate text-center text-xl font-bold">{title}</h1>
      <div className="flex justify-end">{action}</div>
    </div>
  )
}
