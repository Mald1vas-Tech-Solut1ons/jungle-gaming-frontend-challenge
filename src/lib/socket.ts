import type { Socket } from 'socket.io-client'
import type { ClientToServerEvents, NftUpdatedEvent, OrderUpdatedEvent, ServerToClientEvents } from '@/api/contracts'
import { queryClient } from './query-client'
import { getToken, onSessionChange, onSessionExpired } from './session'

/**
 * Cliente de tempo real (Socket.IO real via socket.io-client; o transporte
 * WebSocket é interceptado pelo MSW em dev/demo — ver mocks/realtime.ts).
 *
 * Garantias implementadas aqui:
 *  - deduplicação por `eventId` (tolerância a eventos repetidos);
 *  - rejeição de eventos antigos por `version` do recurso (sem regressão);
 *  - autenticação do socket via `session.auth` (eventos privados de pedido
 *    só chegam ao dono);
 *  - reconciliação com REST após (re)conexão: invalida consultas ativas;
 *  - logout limpa o cache privado e re-emite `session.auth` sem token.
 */

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'wss://realtime.jungle.mock'

type RealtimeEvent = NftUpdatedEvent | OrderUpdatedEvent

export interface RealtimeFeedback {
  kind: 'nft' | 'order'
  message: string
  event: RealtimeEvent
}

type FeedbackListener = (feedback: RealtimeFeedback) => void

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null
let currentToken: string | null = getToken()

const seenEventIds = new Set<string>()
const latestVersions = new Map<string, number>()

const feedbackListeners = new Set<FeedbackListener>()

/** Recurso X versão: chave de controle de ordem. */
function resourceKey(event: RealtimeEvent): string {
  return `${event.resource.kind}:${event.resource.id}`
}

function remember(event: RealtimeEvent): boolean {
  if (seenEventIds.has(event.eventId)) return false // duplicata exata
  seenEventIds.add(event.eventId)
  if (seenEventIds.size > 300) {
    const first = seenEventIds.values().next().value
    if (first !== undefined) seenEventIds.delete(first)
  }
  const key = resourceKey(event)
  const known = latestVersions.get(key) ?? 0
  if (event.version <= known) return false // evento antigo/fora de ordem — ignora
  latestVersions.set(key, event.version)
  return true
}

/**
 * Segunda linha de defesa contra regressão: após um reload completo da página
 * o mapa de versões em memória começa vazio. Um evento antigo emitido nesse
 * intervalo não pode regredir um estado mais novo já presente no cache REST.
 */
function isStaleAgainstCache(event: RealtimeEvent): boolean {
  const key = event.resource.kind === 'nft' ? 'nft' : 'order'
  const cached = queryClient.getQueryData([key, event.resource.id]) as { version?: number } | undefined
  const cachedVersion = cached?.version
  if (cachedVersion != null && cachedVersion > event.version) {
    // Registra a versão mais nova para eventos seguintes
    latestVersions.set(resourceKey(event), Math.max(latestVersions.get(resourceKey(event)) ?? 0, cachedVersion))
    return true
  }
  return false
}

/** Atualiza o cache do TanStack Query em lugar (sem flicker) e invalida derivados. */
function applyNftEvent(event: NftUpdatedEvent) {
  const { nft } = event.payload
  // Detalhe aberto
  queryClient.setQueryData(['nft', nft.id], (old: unknown) => {
    if (!old || typeof old !== 'object') return old
    return { ...(old as object), price: nft.price, editions: nft.editions, version: nft.version }
  })
  // Listas de catálogo em cache (qualquer chave ['nfts', ...])
  queryClient.setQueriesData({ queryKey: ['nfts'] }, (old: unknown) => {
    const data = old as { items?: { id: string }[] } | undefined
    if (!data?.items) return old
    return {
      ...data,
      items: data.items.map((item) => (item.id === nft.id ? { ...item, price: nft.price, editions: nft.editions, version: nft.version } : item)),
    }
  })
  // Carrinho e cotação derivam do preço/disponibilidade
  queryClient.invalidateQueries({ queryKey: ['cart'] })
  queryClient.invalidateQueries({ queryKey: ['quote'] })
}

function applyOrderEvent(event: OrderUpdatedEvent) {
  const { order } = event.payload
  queryClient.setQueryData(['order', order.id], order)
  queryClient.invalidateQueries({ queryKey: ['orders'] })
  // Pedido confirmado remove itens do carrinho no mock — sincroniza
  queryClient.invalidateQueries({ queryKey: ['cart'] })
}

function handleEvent(event: RealtimeEvent) {
  if (!remember(event)) return
  if (isStaleAgainstCache(event)) return
  if (event.type === 'nft.updated') {
    applyNftEvent(event)
    notify({ kind: 'nft', message: 'Preço/disponibilidade atualizados em tempo real.', event })
  } else {
    applyOrderEvent(event)
    const status = event.payload.order.status
    notify({
      kind: 'order',
      message: status === 'confirmed' ? 'Pedido confirmado na rede!' : status === 'rejected' ? 'Pagamento recusado.' : 'Pedido atualizado.',
      event,
    })
  }
}

function notify(feedback: RealtimeFeedback) {
  for (const cb of feedbackListeners) cb(feedback)
}

/** Assina feedbacks de tempo real (toasts, banners de UI). Retorna unsubscribe. */
export function onRealtimeFeedback(cb: FeedbackListener): () => void {
  feedbackListeners.add(cb)
  return () => {
    feedbackListeners.delete(cb)
  }
}

/** Reconciliação REST após (re)conexão: revalida consultas ativas. */
function reconcile() {
  queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'nfts' || q.queryKey[0] === 'nft' || q.queryKey[0] === 'cart' || q.queryKey[0] === 'quote' })
  queryClient.invalidateQueries({ queryKey: ['orders'] })
  queryClient.invalidateQueries({ queryKey: ['order'] })
}

function emitAuth(token: string | null) {
  socket?.emit('session.auth', { token })
  currentToken = token
}

export async function startRealtime() {
  if (socket) return
  // Import dinâmico DEPOIS do worker.start(): o engine.io-client captura
  // `globalThis.WebSocket` na avaliação do módulo, e o MSW só aplica o patch
  // de WebSocket durante o start — importar antes deixaria o cliente usar o
  // construtor real e tentar resolver `realtime.jungle.mock` via DNS.
  const { io } = await import('socket.io-client')
  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5_000,
    randomizationFactor: 0.4,
  })

  socket.on('connect', () => {
    emitAuth(currentToken)
    // Na primeira conexão e em reconexões, reconcilia com REST.
    reconcile()
  })

  socket.on('nft.updated', handleEvent)
  socket.on('order.updated', handleEvent)
}

export function stopRealtime() {
  socket?.disconnect()
  socket = null
}

// Ciclo de vida da sessão → socket + cache
onSessionChange((token) => {
  if (token === null) {
    // Limpa dados privados do usuário anterior (isolamento entre usuários)
    queryClient.removeQueries({ predicate: (q) => ['cart', 'orders', 'order', 'me', 'wallets', 'favorites', 'quote'].includes(q.queryKey[0] as string) })
  }
  emitAuth(token)
})

onSessionExpired(() => {
  reconcile()
})
