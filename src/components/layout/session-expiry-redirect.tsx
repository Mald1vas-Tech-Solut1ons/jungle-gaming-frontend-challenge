import { useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { onSessionExpired } from '@/lib/session'

/**
 * Expiração de sessão detectada por qualquer transporte (REST ou socket) leva
 * o usuário ao login preservando a rota original em `?redirect` (§3 do
 * enunciado: "expiração durante o checkout, preservando o contexto").
 *
 * A subscrição é feita UMA vez por carregamento de página (flag de módulo),
 * fora do ciclo de vida de efeitos: assinar dentro de useEffect criava um
 * micro-intervalo entre cleanup e re-subscribe em trocas de rota em que o
 * evento podia cair no vazio — token limpo sem redirect (race visto no CI).
 * A rota atual é lida no momento do evento, não capturada em closure.
 */
let subscribed = false

export function SessionExpiryRedirect() {
  const router = useRouter()

  useEffect(() => {
    if (subscribed) return
    subscribed = true
    return onSessionExpired(() => {
      const { pathname, searchStr } = router.state.location
      if (pathname.startsWith('/login')) return
      void router.navigate({
        to: '/login',
        search: { redirect: pathname + (searchStr ?? '') },
      })
    })
  }, [router])

  return null
}
