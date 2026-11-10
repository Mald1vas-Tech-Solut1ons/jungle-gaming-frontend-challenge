import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { LoginRequest, RegisterRequest, Session, User } from '@/api/contracts'
import { api, normalizeError } from '@/lib/api'
import { clearUserCache, queryClient } from '@/lib/query-client'
import { clearGuestCartId, getGuestCartId, getToken, setSession } from '@/lib/session'

export const sessionKeys = {
  session: ['session'] as const,
}

/**
 * Sessão recuperável após refresh: se houver token salvo, valida na API;
 * 401 limpa a sessão local. `user` é `null` para visitante (e durante o
 * carregamento inicial `undefined`).
 */
export function useSession() {
  const token = getToken()
  return useQuery({
    queryKey: sessionKeys.session,
    queryFn: async (): Promise<User | null> => {
      const { data } = await api.get<Session>('/auth/session')
      return data.user
    },
    enabled: !!token,
    staleTime: 5 * 60_000,
    retry: false,
  })
}

export function useIsAuthenticated(): boolean {
  return !!getToken()
}

interface AuthSuccess {
  token: string
  user: User
}

/** Fluxo pós-autenticação: guarda sessão, migra carrinho de visitante. */
async function finalizeAuth(token: string): Promise<User> {
  setSession(token)
  const { data } = await api.get<Session>('/auth/session')
  // Best-effort: migra o carrinho do visitante (itens preservados ao autenticar)
  try {
    await api.post('/cart/merge', { guestCartId: getGuestCartId() })
    clearGuestCartId()
    await queryClient.invalidateQueries({ queryKey: ['cart'] })
  } catch (error) {
    const err = normalizeError(error)
    toast.warning(err.code === 'NETWORK' ? 'Carrinho do visitante será migrado na próxima conexão.' : 'Não foi possível migrar os itens do carrinho.')
  }
  queryClient.setQueryData(sessionKeys.session, data.user)
  return data.user
}

export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: LoginRequest): Promise<AuthSuccess> => {
      const { data } = await api.post<Session>('/auth/login', credentials)
      return { token: data.token, user: data.user }
    },
    onSuccess: async ({ token }) => {
      await finalizeAuth(token)
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: async (payload: RegisterRequest): Promise<AuthSuccess> => {
      const { data } = await api.post<Session>('/auth/register', payload)
      return { token: data.token, user: data.user }
    },
    onSuccess: async ({ token }) => {
      await finalizeAuth(token)
    },
  })
}

export function useLogout() {
  const navigate = useNavigate()
  const queryClientHook = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      try {
        await api.post('/auth/logout')
      } catch {
        /* logout local mesmo sem rede */
      }
      return null
    },
    onSuccess: () => {
      setSession(null)
      clearGuestCartId()
      clearUserCache()
      queryClientHook.removeQueries({ queryKey: sessionKeys.session })
      toast.success('Você saiu da sua conta.')
      void navigate({ to: '/' })
    },
  })
}
