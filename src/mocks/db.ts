import type { Cart, Nft, Order, User, Wallet } from '@/api/contracts'
import { FIXTURE_EPOCH, FIXTURE_USERS, FIXTURE_WALLETS, buildNfts } from './fixtures'

/**
 * Estado único e consistente da API simulada (catálogo, usuários, sessões,
 * favoritos, carrinhos, carteiras e pedidos). Persistido em localStorage para
 * sobreviver a refresh; `resetDb()` restaura integralmente o cenário conhecido.
 */

export interface StoredUser extends User {
  passwordHash: string
  salt: string
}

export interface SessionRecord {
  token: string
  userId: string
  expiresAt: string
}

export interface IdempotencyRecord {
  key: string
  userId: string
  requestHash: string
  orderId: string
}

export interface DbState {
  schema: number
  nfts: Nft[]
  users: StoredUser[]
  sessions: SessionRecord[]
  favorites: Record<string, string[]>
  /** Chave: `user:<id>` ou `guest:<id>` */
  carts: Record<string, Cart>
  wallets: Record<string, Wallet[]>
  orders: Order[]
  idempotency: IdempotencyRecord[]
  /** Sequência para ids de eventos e entidades (determinística) */
  seq: number
  /** Relógio lógico da simulação — avança a cada operação */
  clock: number
}

const STORAGE_KEY = 'mock:db'
const SCHEMA = 2

let state: DbState | null = null

export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function seed(): Promise<DbState> {
  const users: StoredUser[] = []
  for (const u of FIXTURE_USERS) {
    const salt = `salt-${u.id}`
    users.push({
      id: u.id,
      name: u.name,
      email: u.email,
      username: u.username,
      bio: u.bio,
      avatarUrl: null,
      createdAt: new Date(FIXTURE_EPOCH - 90 * 86_400_000).toISOString(),
      salt,
      passwordHash: await hashPassword(u.password, salt),
    })
  }
  return {
    schema: SCHEMA,
    nfts: buildNfts(),
    users,
    sessions: [],
    favorites: { 'user-ana': ['nft-002', 'nft-005'], 'user-bruno': [] },
    carts: {},
    wallets: structuredClone(FIXTURE_WALLETS),
    orders: [],
    idempotency: [],
    seq: 1000,
    clock: FIXTURE_EPOCH,
  }
}

export async function initDb() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DbState
      if (parsed.schema === SCHEMA) {
        state = parsed
        return
      }
    } catch {
      /* estado corrompido → reseed */
    }
  }
  state = await seed()
  persist()
}

export async function resetDb() {
  state = await seed()
  persist()
}

export function db(): DbState {
  if (!state) throw new Error('Mock DB não inicializado')
  return state
}

export function persist() {
  if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

/** Executa uma mutação e persiste. */
export function mutate<T>(fn: (s: DbState) => T): T {
  const result = fn(db())
  persist()
  return result
}

export function nextId(prefix: string): string {
  return mutate((s) => `${prefix}-${++s.seq}`)
}

/** Agora "real" para expiração de sessão/cupom; usa Date.now (controlável via page.clock nos testes). */
export function now(): number {
  return Date.now()
}

export function toPublicUser(u: StoredUser): User {
  const { passwordHash: _h, salt: _s, ...user } = u
  return user
}

