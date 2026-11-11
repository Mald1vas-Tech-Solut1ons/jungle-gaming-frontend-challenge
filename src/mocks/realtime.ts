import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { Nft, NftUpdatedEvent, Order, OrderUpdatedEvent } from '@/api/contracts'
import { db, mutate } from './db'

/**
 * Servidor Socket.IO simulado via MSW (`ws.link` + `@mswjs/socket.io-binding`).
 * O app usa o `socket.io-client` real com transporte `websocket`; o MSW
 * intercepta a conexão WebSocket e fala o protocolo Engine.IO/Socket.IO.
 */

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'wss://realtime.jungle.mock'

const realtime = ws.link(`${SOCKET_URL}/*`)

interface Conn {
  id: number
  userId: string | null
  io: ReturnType<typeof toSocketIo>
  close: () => void
  pingTimer: ReturnType<typeof setInterval>
}

const connections = new Set<Conn>()
let connCounter = 0
const recentEvents: (NftUpdatedEvent | OrderUpdatedEvent)[] = []

function resolveUser(token: string | null): string | null {
  if (!token) return null
  const s = db().sessions.find((x) => x.token === token)
  if (!s || new Date(s.expiresAt).getTime() < Date.now()) return null
  return s.userId
}

export const realtimeHandlers = [
  realtime.addEventListener('connection', (connection) => {
    const io = toSocketIo(connection)
    const conn: Conn = {
      id: ++connCounter,
      userId: null,
      io,
      close: () => connection.client.close(),
      // Engine.IO: servidor envia "2" (ping); cliente responde "3" (pong)
      pingTimer: setInterval(() => {
        try {
          connection.client.send('2')
        } catch {
          /* conexão já fechada */
        }
      }, 20_000),
    }
    connections.add(conn)

    io.client.on('session.auth', (_event, payload: { token: string | null }) => {
      conn.userId = resolveUser(payload?.token ?? null)
    })

    connection.client.addEventListener('close', () => {
      clearInterval(conn.pingTimer)
      connections.delete(conn)
    })
  }),
]

function remember(event: NftUpdatedEvent | OrderUpdatedEvent) {
  recentEvents.push(event)
  if (recentEvents.length > 50) recentEvents.shift()
}

export function emitNftUpdated(nft: Nft) {
  const event: NftUpdatedEvent = {
    eventId: mutate((s) => `evt-${++s.seq}`),
    type: 'nft.updated',
    resource: { kind: 'nft', id: nft.id },
    version: nft.version,
    emittedAt: new Date().toISOString(),
    payload: { nft: { id: nft.id, price: nft.price, editions: nft.editions, version: nft.version } },
  }
  remember(event)
  for (const c of connections) c.io.client.emit('nft.updated', event)
  return event
}

export function emitOrderUpdated(order: Order) {
  const event: OrderUpdatedEvent = {
    eventId: mutate((s) => `evt-${++s.seq}`),
    type: 'order.updated',
    resource: { kind: 'order', id: order.id },
    version: order.version,
    userId: order.userId,
    emittedAt: new Date().toISOString(),
    payload: { order },
  }
  remember(event)
  // Eventos privados só vão para conexões autenticadas do dono do pedido
  for (const c of connections) if (c.userId === order.userId) c.io.client.emit('order.updated', event)
  return event
}

/** Reenvia o último evento (duplicata exata) — testa deduplicação no cliente. */
export function replayLastEvent() {
  const last = recentEvents.at(-1)
  if (!last) return null
  for (const c of connections) {
    if (last.type === 'order.updated' && c.userId !== last.userId) continue
    c.io.client.emit(last.type, last as never)
  }
  return last
}

/** Emite um evento com versão anterior à atual — o cliente deve ignorar. */
export function emitStaleNftEvent(nftId: string) {
  const nft = db().nfts.find((n) => n.id === nftId)
  if (!nft) return null
  const stale: NftUpdatedEvent = {
    eventId: mutate((s) => `evt-${++s.seq}`),
    type: 'nft.updated',
    resource: { kind: 'nft', id: nft.id },
    version: Math.max(0, nft.version - 1),
    emittedAt: new Date().toISOString(),
    payload: {
      nft: {
        id: nft.id,
        price: '999.000',
        editions: nft.editions.map((e) => ({ ...e, price: '999.000', available: 0 })),
        version: Math.max(0, nft.version - 1),
      },
    },
  }
  for (const c of connections) c.io.client.emit('nft.updated', stale)
  return stale
}

/** Derruba todas as conexões; o cliente se reconecta naturalmente. */
export function dropConnections(_downMs = 0) {
  // Fechamento com código normal (1000): o engine.io-client se reconecta
  // após close normal. Código 1011 (erro interno) fazia o cliente desistir
  // permanentemente de reconectar — comportamento observado em teste.
  for (const c of [...connections]) c.close()
}

export function connectionCount() {
  return connections.size
}

