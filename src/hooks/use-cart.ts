import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AddCartItemRequest, Cart } from '@/api/contracts'
import { api, normalizeError } from '@/lib/api'

export const cartKeys = {
  cart: ['cart'] as const,
  quote: (network: string) => ['quote', network] as const,
}

/**
 * Carrinho (visitante via `X-Guest-Cart-Id`, usuário via sessão).
 * A API devolve valores denormalizados sempre frescos (hydrate no mock);
 * eventos `nft.updated` invalidam esta chave.
 */
export function useCart() {
  return useQuery({
    queryKey: cartKeys.cart,
    queryFn: async () => {
      const { data } = await api.get<Cart>('/cart')
      return data
    },
    staleTime: 0, // carrinho sempre fresco
  })
}

/** Quantidade total de itens para o badge do header. */
export function useCartCount(): number {
  const { data } = useCart()
  return data?.items.reduce((acc, item) => acc + item.quantity, 0) ?? 0
}

export function useAddCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AddCartItemRequest) => {
      const { data } = await api.post<Cart>('/cart/items', payload)
      return data
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(cartKeys.cart, cart)
      void queryClient.invalidateQueries({ queryKey: ['quote'] })
      toast.success('Adicionado ao carrinho.')
    },
    onError: (error) => {
      toast.error(normalizeError(error).message)
    },
  })
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const { data } = await api.patch<Cart>(`/cart/items/${itemId}`, { quantity })
      return data
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(cartKeys.cart, cart)
      void queryClient.invalidateQueries({ queryKey: ['quote'] })
    },
    onError: (error) => toast.error(normalizeError(error).message),
  })
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { data } = await api.delete<Cart>(`/cart/items/${itemId}`)
      return data
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(cartKeys.cart, cart)
      void queryClient.invalidateQueries({ queryKey: ['quote'] })
    },
    onError: (error) => toast.error(normalizeError(error).message),
  })
}

export function useApplyCoupon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.post<Cart>('/cart/coupon', { code })
      return data
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(cartKeys.cart, cart)
      void queryClient.invalidateQueries({ queryKey: ['quote'] })
      toast.success('Cupom aplicado.')
    },
    onError: (error) => {
      const err = normalizeError(error)
      toast.error(err.code === 'COUPON_INVALID' ? 'Cupom inválido.' : err.code === 'COUPON_EXPIRED' ? 'Este cupom expirou.' : err.message)
    },
  })
}

export function useRemoveCoupon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<Cart>('/cart/coupon')
      return data
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(cartKeys.cart, cart)
      void queryClient.invalidateQueries({ queryKey: ['quote'] })
    },
    onError: (error) => toast.error(normalizeError(error).message),
  })
}
