import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { FavoritesResponse, Nft, NftListParams, Paginated } from '@/api/contracts'
import { api, normalizeError } from '@/lib/api'
import { getToken } from '@/lib/session'

export const nftKeys = {
  list: (params: NftListParams) => ['nfts', params] as const,
  detail: (id: string) => ['nft', id] as const,
  favorites: ['favorites'] as const,
}

/** Catálogo: busca, filtros combináveis, ordenação e paginação refletidos na URL. */
export function useNftList(params: NftListParams) {
  return useQuery({
    queryKey: nftKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (params.q) qs.set('q', params.q)
      if (params.category?.length) qs.set('category', params.category.join(','))
      if (params.rarity?.length) qs.set('rarity', params.rarity.join(','))
      if (params.chain?.length) qs.set('chain', params.chain.join(','))
      if (params.minPrice) qs.set('minPrice', params.minPrice)
      if (params.maxPrice) qs.set('maxPrice', params.maxPrice)
      if (params.sort) qs.set('sort', params.sort)
      if (params.page) qs.set('page', String(params.page))
      if (params.pageSize) qs.set('pageSize', String(params.pageSize))
      const { data } = await api.get<Paginated<Nft>>('/nfts', { params: qs })
      return data
    },
    placeholderData: (previous) => previous, // mantém a página anterior visível entre trocas (sem flicker)
  })
}

/** Detalhe com acesso direto; 404 vira estado de erro tipado. */
export function useNftDetail(id: string) {
  return useQuery({
    queryKey: nftKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Nft>(`/nfts/${id}`)
      return data
    },
    enabled: !!id,
    retry: false, // 404 não deve repetir
  })
}

export function useFavorites() {
  const token = getToken()
  return useQuery({
    queryKey: nftKeys.favorites,
    queryFn: async () => {
      const { data } = await api.get<FavoritesResponse>('/favorites')
      return data
    },
    enabled: !!token,
    staleTime: 30_000,
  })
}

export function isFavorite(nftId: string, favorites: FavoritesResponse | undefined): boolean {
  return !!favorites?.nftIds.includes(nftId)
}

/**
 * Favorito com atualização otimista + rollback em falha (requisito §4).
 * Exige autenticação; quando visitante, a UI redireciona para login.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ nftId, active }: { nftId: string; active: boolean }) => {
      if (active) await api.delete(`/favorites/${nftId}`)
      else await api.put(`/favorites/${nftId}`)
      return !active
    },
    onMutate: async ({ nftId, active }) => {
      await queryClient.cancelQueries({ queryKey: nftKeys.favorites })
      const previous = queryClient.getQueryData<FavoritesResponse>(nftKeys.favorites)
      queryClient.setQueryData<FavoritesResponse>(nftKeys.favorites, (old) => ({
        nftIds: active ? (old?.nftIds ?? []).filter((id) => id !== nftId) : [...(old?.nftIds ?? []), nftId],
      }))
      return { previous }
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(nftKeys.favorites, context.previous)
      toast.error(normalizeError(error).message)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: nftKeys.favorites })
      void queryClient.invalidateQueries({ queryKey: ['nft'] })
    },
  })
}
