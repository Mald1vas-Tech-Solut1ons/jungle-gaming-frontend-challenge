import { useEffect } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { onSessionExpired } from '@/lib/session'

/**
 * Sessão expirada no meio de um fluxo (navegação ou checkout): limpa o token e
 * leva ao login preservando a rota atual em `?redirect` — o usuário retoma
 * exatamente de onde parou após autenticar.
 */
export function SessionExpiryRedirect() {
  const navigate = useNavigate()
  // location.search é objeto parseado; searchStr é a string bruta da URL.
  const path = useRouterState({ select: (s) => s.location.pathname + (s.location.searchStr ?? '') })

  useEffect(() => {
    return onSessionExpired(() => {
      if (path.startsWith('/login')) return
      void navigate({ to: '/login', search: { redirect: path } })
    })
  }, [navigate, path])

  return null
}
