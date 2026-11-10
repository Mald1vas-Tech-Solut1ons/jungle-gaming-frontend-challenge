import { QueryClient } from '@tanstack/react-query'
import { isRetryable } from './api'

/**
 * Política de cache central (documentada também no ARCHITECTURE.md):
 *
 *  - `staleTime: 30s` — dados de catálogo/detalhe são servidos do cache por 30s
 *    antes de revalidar; eventos Socket.IO e mutations invalidam antes disso.
 *  - `refetchOnWindowFocus: true` — reconciliação barata ao voltar para a aba.
 *  - `retry` com espera crescente apenas para erros retryable (rede/timeout/5xx
 *    transitório); 4xx nunca repete. GETs já retryam no Axios (2 tentativas);
 *    o retry do Query cobre falhas além do transporte.
 *  - `gcTime: 5min` — dados fora de uso são descartados após 5 minutos.
 *  - Mutations NUNCA repetem sozinhas (0 retries): recuperação é explícita via
 *    idempotência (pedidos) ou ação do usuário.
 *  - Perfil/favoritos/orders de um usuário são limpos no logout
 *    (`clearUserCache`), impedindo vazamento entre usuários.
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => failureCount < 2 && isRetryable(error),
      retryDelay: (attempt) => Math.min(250 * 2 ** attempt + Math.random() * 150, 2_000),
    },
    mutations: {
      retry: 0,
    },
  },
})

/** Limpa todo o cache (logout, troca de usuário, reset do mock). */
export function clearAllCache() {
  queryClient.clear()
}

/** Remove apenas consultas dependentes da sessão do usuário. */
export function clearUserCache() {
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'nfts' && q.queryKey[0] !== 'nft' })
}
