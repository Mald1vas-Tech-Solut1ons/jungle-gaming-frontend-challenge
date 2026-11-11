import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ChangePasswordRequest, UpdateProfileRequest, UpsertWalletRequest, User, Wallet, WalletConnectResponse } from '@/api/contracts'
import { api, normalizeError } from '@/lib/api'
import { sessionKeys } from './use-session'

export const accountKeys = {
  me: ['me'] as const,
  wallets: ['wallets'] as const,
}

export function useMe() {
  return useQuery({
    queryKey: accountKeys.me,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<User>('/me', { signal })
      return data
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateProfileRequest) => {
      const { data } = await api.put<User>('/me', payload)
      return data
    },
    onSuccess: (user) => {
      queryClient.setQueryData(accountKeys.me, user)
      queryClient.setQueryData(sessionKeys.session, user)
      toast.success('Perfil atualizado.')
    },
    onError: (error) => toast.error(normalizeError(error).message),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: ChangePasswordRequest) => {
      await api.post('/me/password', payload)
      return null
    },
    onSuccess: () => toast.success('Senha alterada com sucesso.'),
    onError: (error) => toast.error(normalizeError(error).message),
  })
}

export function useWallets() {
  return useQuery({
    queryKey: accountKeys.wallets,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Wallet[]>('/wallets', { signal })
      return data
    },
  })
}

export function useCreateWallet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpsertWalletRequest) => {
      const { data } = await api.post<Wallet>('/wallets', payload)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.wallets })
      toast.success('Carteira cadastrada.')
    },
    onError: (error) => toast.error(normalizeError(error).message),
  })
}

export function useUpdateWallet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpsertWalletRequest }) => {
      const { data } = await api.put<Wallet>(`/wallets/${id}`, payload)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.wallets })
      toast.success('Carteira atualizada.')
    },
    onError: (error) => toast.error(normalizeError(error).message),
  })
}

/** Simulação de conexão da carteira (cenário `wallet-refused` recusa). */
export function useConnectWallet() {
  return useMutation({
    mutationFn: async (walletId: string) => {
      const { data } = await api.post<WalletConnectResponse>(`/wallets/${walletId}/connect`)
      return data
    },
    onError: (error) => toast.error(normalizeError(error).message),
  })
}
