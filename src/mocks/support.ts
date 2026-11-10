import Decimal from 'decimal.js'
import type { Cart, CartItem, Chain, Nft, Quote, QuoteLine } from '@/api/contracts'
import { COUPONS, NETWORK_FEES } from './fixtures'
import { db, mutate, type StoredUser } from './db'
import { apiError, isScenario, once } from './scenarios'

export const API = '/api'

/** Configuração ajustável em runtime pelos endpoints de controle (testes) */
export const runtime = {
  sessionTtlMs: 30 * 60_000,
  /** Tempo até o pedido pendente ser liquidado. `null` = manual (via controle) */
  orderSettleMs: 2500 as number | null,
  orderTimeoutDelayMs: 15_000,
}

// ---------------- Auth ----------------

export type AuthResult = { user: StoredUser; token: string } | { response: Response }

export function getToken(request: Request): string | null {
  const h = request.headers.get('authorization')
  return h?.startsWith('Bearer ') ? h.slice(7) : null
}

export function authenticate(request: Request): AuthResult {
  const token = getToken(request)
  if (!token) return { response: apiError(401, 'UNAUTHENTICATED', 'Faça login para continuar.') }
  const session = db().sessions.find((s) => s.token === token)
  if (!session) return { response: apiError(401, 'UNAUTHENTICATED', 'Sessão inválida.') }
  const expired = new Date(session.expiresAt).getTime() < Date.now()
  if (expired || (isScenario('session-expired') && once('session-expired'))) {
    mutate((s) => {
      s.sessions = s.sessions.filter((x) => x.token !== token)
    })
    return { response: apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.') }
  }
  const user = db().users.find((u) => u.id === session.userId)
  if (!user) return { response: apiError(401, 'UNAUTHENTICATED', 'Sessão inválida.') }
  return { user, token }
}

/** Usuário opcional (rotas públicas que se comportam diferente quando autenticado) */
export function optionalUser(request: Request): StoredUser | null | Response {
  if (!getToken(request)) return null
  const auth = authenticate(request)
  return 'response' in auth ? auth.response : auth.user
}

// ---------------- Carrinho ----------------

export function cartKey(request: Request, user: StoredUser | null): string | null {
  if (user) return `user:${user.id}`
  const guest = request.headers.get('x-guest-cart-id')
  return guest && /^[a-zA-Z0-9-]{8,64}$/.test(guest) ? `guest:${guest}` : null
}

export function emptyCart(id: string): Cart {
  return { id, items: [], couponCode: null, updatedAt: new Date().toISOString() }
}

export function findEdition(nftId: string, editionId: string) {
  const nft = db().nfts.find((n) => n.id === nftId)
  const edition = nft?.editions.find((e) => e.id === editionId)
  return { nft, edition }
}

/** Atualiza os campos denormalizados com o estado atual do catálogo. */
export function hydrateCart(cart: Cart): Cart {
  return {
    ...cart,
    items: cart.items
      .map((item): CartItem | null => {
        const { nft, edition } = findEdition(item.nftId, item.editionId)
        if (!nft || !edition) return null
        return {
          ...item,
          nftName: nft.name,
          editionName: edition.name,
          image: nft.images[0],
          unitPrice: edition.price,
          available: edition.available,
          maxPerOrder: edition.maxPerOrder,
          nftVersion: nft.version,
        }
      })
      .filter((x): x is CartItem => x !== null),
  }
}

export function getCart(key: string): Cart {
  return hydrateCart(db().carts[key] ?? emptyCart(key))
}

export function saveCart(key: string, cart: Cart) {
  mutate((s) => {
    s.carts[key] = { ...cart, updatedAt: new Date().toISOString() }
  })
}

export function maxAllowed(nft: Nft, editionId: string) {
  const ed = nft.editions.find((e) => e.id === editionId)
  return ed ? Math.min(ed.available, ed.maxPerOrder) : 0
}

// ---------------- Cupom e cotação ----------------

export type CouponCheck =
  | { ok: true; code: string; percentOff: number }
  | { ok: false; code: 'COUPON_INVALID' | 'COUPON_EXPIRED'; message: string }

export function checkCoupon(raw: string): CouponCheck {
  const code = raw.trim().toUpperCase()
  const coupon = COUPONS.find((c) => c.code === code)
  if (!coupon) return { ok: false, code: 'COUPON_INVALID', message: 'Cupom inválido.' }
  if (new Date(coupon.expiresAt).getTime() < Date.now())
    return { ok: false, code: 'COUPON_EXPIRED', message: 'Este cupom expirou.' }
  return { ok: true, code: coupon.code, percentOff: coupon.percentOff }
}

function fingerprint(parts: unknown): string {
  // djb2 sobre JSON — suficiente para detectar mudança de conteúdo na simulação
  const str = JSON.stringify(parts)
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0
  return `fp_${(h >>> 0).toString(16)}`
}

export function computeQuote(cart: Cart, network: Chain): Quote {
  const lines: QuoteLine[] = cart.items.map((i) => ({
    nftId: i.nftId,
    editionId: i.editionId,
    name: i.nftName,
    editionName: i.editionName,
    image: i.image,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    lineTotal: new Decimal(i.unitPrice).times(i.quantity).toFixed(),
    available: i.available,
  }))
  const subtotal = lines.reduce((acc, l) => acc.plus(l.lineTotal), new Decimal(0))
  const couponCheck = cart.couponCode ? checkCoupon(cart.couponCode) : null
  const coupon = couponCheck?.ok ? { code: couponCheck.code, percentOff: couponCheck.percentOff } : null
  const discount = coupon ? subtotal.times(coupon.percentOff).dividedBy(100).toDecimalPlaces(18) : new Decimal(0)
  const networkFee = lines.length ? new Decimal(NETWORK_FEES[network]) : new Decimal(0)
  const total = subtotal.minus(discount).plus(networkFee)
  const body = {
    lines: lines.map((l) => [l.nftId, l.editionId, l.quantity, l.unitPrice, l.available]),
    coupon,
    network,
    fee: networkFee.toFixed(),
  }
  return {
    id: `quote-${fingerprint([cart.id, body]).slice(3)}`,
    lines,
    subtotal: subtotal.toFixed(),
    discount: discount.toFixed(),
    networkFee: networkFee.toFixed(),
    total: total.toFixed(),
    coupon,
    network,
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    fingerprint: fingerprint(body),
  }
}

/** Recalcula o "menor preço disponível" do NFT após alteração de edições. */
export function refreshNftPrice(nft: Nft) {
  const prices = nft.editions.filter((e) => e.available > 0).map((e) => new Decimal(e.price))
  if (prices.length) nft.price = Decimal.min(...prices).toFixed()
}

export const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'A senha deve ter pelo menos 8 caracteres.'
  if (!/\d/.test(pw)) return 'A senha deve conter ao menos um número.'
  if (!/[A-Za-z]/.test(pw)) return 'A senha deve conter ao menos uma letra.'
  return null
}

