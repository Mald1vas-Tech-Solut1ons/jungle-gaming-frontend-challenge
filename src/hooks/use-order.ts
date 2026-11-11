import { useCallback, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Chain, CreateOrderRequest, Order, Quote, QuoteRequest } from '@/api/contracts'
import { api, isApiError, normalizeError, ORDER_CREATE_TIMEOUT_MS } from '@/lib/api'
import { cartKeys } from './use-cart'

export const orderKeys = {
  detail: (id: string) => ['order', id] as const,
  list: ['orders'] as const,
}

/**
 * Cotação é a referência para finalizar o pedido (§3): subtotal, desconto,
 * taxa e total SEMPRE vêm da API. O `fingerprint` detecta mudanças e força
 * nova confirmação do usuário.
 */
export function useQuote() {
  const [quote, setQuote] = useState<Quote | null>(null)
  const mutation = useMutation({
    mutationFn: async ({ network }: QuoteRequest) => {
      const { data } = await api.post<Quote>('/quote', { network })
      return data
    },
    onSuccess: (data) => setQuote(data),
  })
  const requestQuote = useCallback(
    (network: Chain) => mutation.mutate({ network }),
    [mutation],
  )
  return { quote, setQuote, requestQuote, isPending: mutation.isPending, error: mutation.error ? normalizeError(mutation.error) : null }
}

export function useOrders(status?: string) {
  return useQuery({
    queryKey: [...orderKeys.list, status ?? 'all'],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Order[]>('/orders', { params: status ? { status } : undefined, signal })
      return data
    },
  })
}

/**
 * Detalhe do pedido. Atualizado em tempo real por `order.updated` (socket) e
 * revalidado após reconexão — a confirmação só aparece quando a simulação
 * efetivamente confirmar.
 */
export function useOrderDetail(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Order>(`/orders/${id}`, { signal })
      return data
    },
    enabled: !!id,
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 2_000 : false),
    retry: false,
  })
}

export interface CreateOrderInput {
  quoteFingerprint: string
  walletId: string
  network: Chain
  collector: CreateOrderRequest['collector']
}

export type CreateOrderState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'pending-recovery'; idempotencyKey: string } // pedido criado mas resposta perdida (timeout)
  | { kind: 'conflict'; code: string; quote?: Quote; message: string } // 409: cotação mudou etc.
  | { kind: 'done'; order: Order }

/**
 * Criação idempotente do pedido (requisito §5):
 *  - gera uma chave de idempotência por tentativa de checkout e a mantém em
 *    refs — cliques repetidos durante o envio são absorvidos pelo estado
 *    `submitting` (proteção contra clique duplo) e, após timeout, a
 *    recuperação reenvia a MESMA chave, recuperando o mesmo pedido;
 *  - 409 (QUOTE_CHANGED/AVAILABILITY_CONFLICT/COUPON_EXPIRED) devolve a nova
 *    cotação para revisão e nova confirmação do usuário.
 */
export function useCreateOrder() {
  const queryClient = useQueryClient()
  const [state, setState] = useState<CreateOrderState>({ kind: 'idle' })
  const idempotencyKeyRef = useRef<string | null>(null)
  const pendingPayloadRef = useRef<CreateOrderInput | null>(null)

  const submit = useCallback(
    async (input: CreateOrderInput) => {
      if (!idempotencyKeyRef.current) idempotencyKeyRef.current = crypto.randomUUID()
      pendingPayloadRef.current = input
      const key = idempotencyKeyRef.current
      setState({ kind: 'submitting' })
      try {
        const { data } = await api.post<Order>(
          '/orders',
          {
            quoteId: `quote-${input.quoteFingerprint.replace('fp_', '')}`, // o mock recalcula; id é opaco
            quoteFingerprint: input.quoteFingerprint,
            walletId: input.walletId,
            network: input.network,
            collector: input.collector,
          },
          { headers: { 'Idempotency-Key': key }, timeout: ORDER_CREATE_TIMEOUT_MS },
        )
        idempotencyKeyRef.current = null
        queryClient.setQueryData(orderKeys.detail(data.id), data)
        void queryClient.invalidateQueries({ queryKey: orderKeys.list })
        void queryClient.invalidateQueries({ queryKey: cartKeys.cart })
        setState({ kind: 'done', order: data })
        return data
      } catch (error) {
        const err = normalizeError(error)
        if (err.code === 'TIMEOUT' || err.code === 'NETWORK') {
          // O pedido pode existir: recuperação pela mesma chave de idempotência
          setState({ kind: 'pending-recovery', idempotencyKey: key })
          toast.warning('O servidor demorou. Verificando o status do pedido…')
          return null
        }
        if (err.code === 'QUOTE_CHANGED' || err.code === 'AVAILABILITY_CONFLICT' || err.code === 'COUPON_EXPIRED') {
          setState({ kind: 'conflict', code: err.code, quote: (err.details as { quote?: Quote } | undefined)?.quote, message: err.message })
          return null
        }
        setState({ kind: 'idle' })
        toast.error(err.message)
        return null
      }
    },
    [queryClient],
  )

  /** Recuperação após timeout: mesma chave → mesmo pedido (ou conflito se mudou). */
  const recover = useCallback(async () => {
    const input = pendingPayloadRef.current
    const key = idempotencyKeyRef.current
    if (!input || !key) return null
    setState({ kind: 'submitting' })
    try {
      const { data } = await api.post<Order>(
        '/orders',
        {
          quoteId: `quote-${input.quoteFingerprint.replace('fp_', '')}`,
          quoteFingerprint: input.quoteFingerprint,
          walletId: input.walletId,
          network: input.network,
          collector: input.collector,
        },
        { headers: { 'Idempotency-Key': key }, timeout: ORDER_CREATE_TIMEOUT_MS },
      )
      idempotencyKeyRef.current = null
      queryClient.setQueryData(orderKeys.detail(data.id), data)
      setState({ kind: 'done', order: data })
      return data
    } catch (error) {
      const err = normalizeError(error)
      if (isApiError(err) && err.code === 'IDEMPOTENCY_CONFLICT') {
        setState({ kind: 'idle' })
        toast.error('Esta tentativa já foi usada com outros dados. Refazendo com novos valores…')
      } else if (err.code === 'TIMEOUT' || err.code === 'NETWORK') {
        setState({ kind: 'pending-recovery', idempotencyKey: key })
        toast.error('Ainda sem resposta. Tente novamente em instantes.')
      } else {
        setState({ kind: 'idle' })
        toast.error(err.message)
      }
      return null
    }
  }, [queryClient])

  /** Nova tentativa do zero (nova chave). */
  const reset = useCallback(() => {
    idempotencyKeyRef.current = null
    pendingPayloadRef.current = null
    setState({ kind: 'idle' })
  }, [])

  return { state, submit, recover, reset }
}
