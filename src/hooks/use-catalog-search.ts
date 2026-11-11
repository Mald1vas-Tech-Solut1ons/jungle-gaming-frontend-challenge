import { useCallback } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'

/**
 * Busca global do catálogo: o termo vive na URL de `/` (`?q=`). Fora da home,
 * aplicar a busca leva ao catálogo; na home, preserva os demais filtros e
 * volta para a primeira página.
 */
export function useCatalogSearch() {
  const navigate = useNavigate()
  const onHome = useRouterState({ select: (state) => state.location.pathname === '/' })
  const q = useRouterState({
    select: (state) => {
      if (state.location.pathname !== '/') return ''
      const value = (state.location.search as { q?: unknown }).q
      return typeof value === 'string' ? value : ''
    },
  })

  const apply = useCallback(
    (value: string) => {
      if (onHome) {
        void navigate({ to: '/', search: (prev) => ({ ...prev, q: value, page: 1 }) })
      } else {
        void navigate({ to: '/', search: { q: value } })
      }
    },
    [navigate, onHome],
  )

  return { q, apply, onHome }
}
