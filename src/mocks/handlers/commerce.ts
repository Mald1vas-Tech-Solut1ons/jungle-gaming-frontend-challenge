import { delay, http, HttpResponse } from 'msw'
import type {
  AddCartItemRequest,
  Cart,
  Chain,
  CreateOrderRequest,
  MergeCartRequest,
  Order,
  QuoteRequest,
} from '@/api/contracts'
import { db, mutate, nextId } from '../db'
import { emitNftUpdated, emitOrderUpdated } from '../realtime'
import { apiError, isScenario, once, simulateNetwork } from '../scenarios'
import {
  API,
  authenticate,
  cartKey,
  checkCoupon,
  computeQuote,
  emptyCart,
  findEdition,
  getCart,
  maxAllowed,
  optionalUser,
  refreshNftPrice,
  runtime,
  saveCart,
} from '../support'

const CHAINS: Chain[] = ['ethereum', 'polygon', 'solana']

/** Resolve o carrinho da requisição (usuário autenticado ou visitante). */
async function resolveCart(request: Request) {
  const user = optionalUser(request)
  if (user instanceof Response) return { response: user }
  const key = cartKey(request, user)
  if (!key) return { response: apiError(400, 'VALIDATION_ERROR', 'Identificador de carrinho ausente.') }
  return { key, user }
}

function upsertItem(cart: Cart, req: AddCartItemRequest, mode: 'add' | 'set'): Response | Cart {
  const { nft, edition } = findEdition(req.nftId, req.editionId)
  if (!nft || !edition) return apiError(404, 'NOT_FOUND', 'NFT ou edição não encontrada.')
  if (!Number.isInteger(req.quantity) || req.quantity < 1)
    return apiError(422, 'VALIDATION_ERROR', 'Quantidade inválida.', { quantity: 'Informe uma quantidade inteira ≥ 1.' })
  if (edition.available === 0) return apiError(409, 'AVAILABILITY_CONFLICT', 'Esta edição está esgotada.')
  const existing = cart.items.find((i) => i.nftId === req.nftId && i.editionId === req.editionId)
  const desired = mode === 'add' ? (existing?.quantity ?? 0) + req.quantity : req.quantity
  const limit = maxAllowed(nft, edition.id)
  if (desired > limit)
    return apiError(409, 'AVAILABILITY_CONFLICT', `Quantidade máxima para esta edição: ${limit}.`, {
      quantity: `Máximo de ${limit}.`,
    })
  if (existing) existing.quantity = desired
  else
    cart.items.push({
      id: nextId('ci'),
      nftId: nft.id,
      editionId: edition.id,
      quantity: desired,
      nftName: nft.name,
      editionName: edition.name,
      image: nft.images[0],
      unitPrice: edition.price,
      available: edition.available,
      maxPerOrder: edition.maxPerOrder,
      nftVersion: nft.version,
    })
  return cart
}

// ---------------- Liquidação de pedidos ----------------

const settleTimers = new Map<string, ReturnType<typeof setTimeout>>()

export function settleOrder(orderId: string, outcome?: 'confirmed' | 'rejected') {
  const order = db().orders.find((o) => o.id === orderId)
  if (!order || order.status !== 'pending') return order
  const final = outcome ?? (order.collector.fullName.toLowerCase().includes('recusar') ? 'rejected' : 'confirmed')
  const updated = mutate((s) => {
    const o = s.orders.find((x) => x.id === orderId)!
    o.status = final
    o.version++
    o.updatedAt = new Date().toISOString()
    if (final === 'confirmed') {
      o.txHash = `0x${hashHex(o.id)}`
      o.explorerUrl = `https://etherscan.mock/tx/${o.txHash}`
      // Remove do carrinho apenas os itens e quantidades comprados
      const cart = s.carts[`user:${o.userId}`]
      if (cart) {
        for (const line of o.lines) {
          const item = cart.items.find((i) => i.nftId === line.nftId && i.editionId === line.editionId)
          if (item) item.quantity -= line.quantity
        }
        cart.items = cart.items.filter((i) => i.quantity > 0)
        if (!cart.items.length) cart.couponCode = null
      }
    } else {
      o.rejectionReason = 'Pagamento recusado pela carteira (saldo insuficiente na simulação).'
      // Devolve o estoque reservado
      for (const line of o.lines) {
        const nft = s.nfts.find((n) => n.id === line.nftId)
        const ed = nft?.editions.find((e) => e.id === line.editionId)
        if (nft && ed) {
          ed.available += line.quantity
          nft.version++
          refreshNftPrice(nft)
        }
      }
    }
    return structuredClone(o)
  })
  if (final === 'rejected') for (const line of updated.lines) {
    const nft = db().nfts.find((n) => n.id === line.nftId)
    if (nft) emitNftUpdated(nft)
  }
  emitOrderUpdated(updated)
  settleTimers.delete(orderId)
  return updated
}

function scheduleSettlement(order: Order) {
  // Cenário `order-timeout`: o pedido fica PENDENTE para exercitar a
  // recuperação por idempotência (o cliente estoura o timeout e reenvia a
  // mesma chave). A liquidação acontece via controle
  // (POST /api/__mock/orders/:id/settle) ou pelo painel de simulação.
  if (isScenario('order-timeout')) return
  if (runtime.orderSettleMs === null || settleTimers.has(order.id)) return
  const createdAt = new Date(order.createdAt).getTime()
  const wait = Math.max(0, createdAt + runtime.orderSettleMs - Date.now())
  const outcome = isScenario('payment-rejected') ? 'rejected' : undefined
  settleTimers.set(order.id, setTimeout(() => settleOrder(order.id, outcome), wait))
}

/** Após refresh da página, retoma a liquidação de pedidos pendentes. */
export function resumePendingOrders() {
  for (const o of db().orders) if (o.status === 'pending') scheduleSettlement(o)
}

function hashHex(seed: string) {
  let out = ''
  let h = 2166136261
  for (let i = 0; out.length < 64; i++) {
    h ^= seed.charCodeAt(i % seed.length) + i
    h = Math.imul(h, 16777619) >>> 0
    out += h.toString(16).padStart(8, '0')
  }
  return out.slice(0, 64)
}

// ---------------- Handlers ----------------

export const commerceHandlers = [
  http.get(`${API}/cart`, async ({ request }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const r = await resolveCart(request)
    if ('response' in r) return r.response
    return HttpResponse.json(getCart(r.key))
  }),

  http.post(`${API}/cart/items`, async ({ request }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const r = await resolveCart(request)
    if ('response' in r) return r.response
    const body = (await request.json()) as AddCartItemRequest
    const result = upsertItem(getCart(r.key), body, 'add')
    if (result instanceof Response) return result
    saveCart(r.key, result)
    return HttpResponse.json(getCart(r.key))
  }),

  http.patch(`${API}/cart/items/:itemId`, async ({ request, params }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const r = await resolveCart(request)
    if ('response' in r) return r.response
    const cart = getCart(r.key)
    const item = cart.items.find((i) => i.id === params.itemId)
    if (!item) return apiError(404, 'NOT_FOUND', 'Item não encontrado no carrinho.')
    const { quantity } = (await request.json()) as { quantity: number }
    const result = upsertItem(cart, { nftId: item.nftId, editionId: item.editionId, quantity }, 'set')
    if (result instanceof Response) return result
    saveCart(r.key, result)
    return HttpResponse.json(getCart(r.key))
  }),

  http.delete(`${API}/cart/items/:itemId`, async ({ request, params }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const r = await resolveCart(request)
    if ('response' in r) return r.response
    const cart = getCart(r.key)
    cart.items = cart.items.filter((i) => i.id !== params.itemId)
    if (!cart.items.length) cart.couponCode = null
    saveCart(r.key, cart)
    return HttpResponse.json(getCart(r.key))
  }),

  /** Mescla o carrinho do visitante no carrinho do usuário após autenticação. */
  http.post(`${API}/cart/merge`, async ({ request }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const auth = authenticate(request)
    if ('response' in auth) return auth.response
    const { guestCartId } = (await request.json()) as { guestCartId: string } & Partial<MergeCartRequest>
    const key = `user:${auth.user.id}`
    const guestKey = `guest:${guestCartId}`
    const guest = db().carts[guestKey]
    const cart = getCart(key)
    const warnings: string[] = []
    if (guest) {
      for (const item of getCart(guestKey).items) {
        const { nft, edition } = findEdition(item.nftId, item.editionId)
        if (!nft || !edition) continue
        const existing = cart.items.find((i) => i.nftId === item.nftId && i.editionId === item.editionId)
        const limit = maxAllowed(nft, edition.id)
        const desired = Math.min(limit, Math.max(existing?.quantity ?? 0, item.quantity))
        if (desired < item.quantity) warnings.push(`${nft.name} (${edition.name}) ajustado para ${desired}.`)
        if (desired <= 0) continue
        if (existing) existing.quantity = desired
        else cart.items.push({ ...item, quantity: desired })
      }
      if (!cart.couponCode && guest.couponCode) cart.couponCode = guest.couponCode
      saveCart(key, cart)
      mutate((s) => {
        delete s.carts[guestKey]
      })
    }
    return HttpResponse.json({ cart: getCart(key), warnings })
  }),

  http.post(`${API}/cart/coupon`, async ({ request }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const r = await resolveCart(request)
    if ('response' in r) return r.response
    const { code } = (await request.json()) as { code: string }
    if (!code?.trim()) return apiError(422, 'VALIDATION_ERROR', 'Informe um cupom.', { code: 'Informe um cupom.' })
    const check = checkCoupon(code)
    if (!check.ok) return apiError(422, check.code, check.message, { code: check.message })
    const cart = getCart(r.key)
    if (!cart.items.length) return apiError(422, 'VALIDATION_ERROR', 'Adicione itens antes de aplicar um cupom.')
    cart.couponCode = check.code
    saveCart(r.key, cart)
    return HttpResponse.json(getCart(r.key))
  }),

  http.delete(`${API}/cart/coupon`, async ({ request }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const r = await resolveCart(request)
    if ('response' in r) return r.response
    const cart = getCart(r.key)
    cart.couponCode = null
    saveCart(r.key, cart)
    return HttpResponse.json(getCart(r.key))
  }),

  // ---------- Cotação ----------
  http.post(`${API}/quote`, async ({ request }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const r = await resolveCart(request)
    if ('response' in r) return r.response
    const body = (await request.json().catch(() => ({}))) as QuoteRequest
    const network = CHAINS.includes(body.network as Chain) ? (body.network as Chain) : 'ethereum'
    return HttpResponse.json(computeQuote(getCart(r.key), network))
  }),

  // ---------- Pedidos ----------
  http.post(`${API}/orders`, async ({ request }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const auth = authenticate(request)
    if ('response' in auth) return auth.response
    const idemKey = request.headers.get('idempotency-key')
    if (!idemKey) return apiError(400, 'VALIDATION_ERROR', 'Cabeçalho Idempotency-Key é obrigatório.')
    const body = (await request.json()) as CreateOrderRequest
    const requestHash = JSON.stringify([body.quoteFingerprint, body.walletId, body.network, body.collector])

    // 1) Idempotência: mesma chave → mesmo pedido; conteúdo diferente → conflito
    const prior = db().idempotency.find((x) => x.key === idemKey && x.userId === auth.user.id)
    if (prior) {
      if (prior.requestHash !== requestHash)
        return apiError(409, 'IDEMPOTENCY_CONFLICT', 'Esta tentativa de pedido já foi usada com outros dados.')
      const existing = db().orders.find((o) => o.id === prior.orderId)!
      return HttpResponse.json(existing, { status: 200 })
    }

    // 2) Validação do colecionador e carteira
    const fields: Record<string, string> = {}
    if (!body.collector?.fullName || body.collector.fullName.trim().length < 3) fields.fullName = 'Informe o nome completo.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.collector?.email ?? '')) fields.email = 'Informe um e-mail válido.'
    if (!/^[a-z0-9._]{3,30}$/.test(body.collector?.username ?? ''))
      fields.username = 'Informe um nome de usuário (3 a 30 caracteres: letras minúsculas, números, ponto ou sublinhado).'
    if ((body.collector?.note ?? '').length > 280) fields.note = 'A observação aceita até 280 caracteres.'
    const wallet = (db().wallets[auth.user.id] ?? []).find((w) => w.id === body.walletId)
    if (!wallet) fields.walletId = 'Selecione uma carteira cadastrada.'
    if (!CHAINS.includes(body.network)) fields.network = 'Selecione uma rede.'
    if (Object.keys(fields).length) return apiError(422, 'VALIDATION_ERROR', 'Verifique os dados do pagamento.', fields)

    const key = `user:${auth.user.id}`
    if (!getCart(key).items.length) return apiError(422, 'VALIDATION_ERROR', 'Seu carrinho está vazio.')

    // 2.5) Desconexão da carteira no momento do pagamento (requisito §3:
    // "simulação de conexão, recusa e desconexão")
    if (isScenario('wallet-disconnect') && once('wallet-disconnect')) {
      return apiError(403, 'FORBIDDEN', 'A carteira foi desconectada durante o pagamento. Reconecte a carteira e tente novamente.', {
        walletId: 'Carteira desconectada. Reconecte antes de confirmar.',
      })
    }

    // 3) Cenários de mudança durante a compra (antes da revalidação)
    if (isScenario('price-change') && once('price-change')) {
      const first = getCart(key).items[0]
      const nft = mutate((s) => {
        const n = s.nfts.find((x) => x.id === first.nftId)!
        const ed = n.editions.find((e) => e.id === first.editionId)!
        ed.price = (Number(ed.price) * 1.1).toFixed(4)
        n.version++
        refreshNftPrice(n)
        return n
      })
      emitNftUpdated(nft)
    }
    if (isScenario('sold-out') && once('sold-out')) {
      const first = getCart(key).items[0]
      const nft = mutate((s) => {
        const n = s.nfts.find((x) => x.id === first.nftId)!
        n.editions.find((e) => e.id === first.editionId)!.available = 0
        n.version++
        refreshNftPrice(n)
        return n
      })
      emitNftUpdated(nft)
    }

    // 4) Revalidação: disponibilidade, cupom, preço e taxa
    const cart = getCart(key)
    const unavailable = cart.items.filter((i) => i.quantity > Math.min(i.available, i.maxPerOrder))
    const quote = computeQuote(cart, body.network)
    if (unavailable.length)
      return HttpResponse.json(
        {
          error: {
            code: 'AVAILABILITY_CONFLICT',
            message: 'Alguns itens não estão mais disponíveis na quantidade solicitada.',
            details: { quote, items: unavailable.map((i) => i.id) },
          },
        },
        { status: 409 },
      )
    if (cart.couponCode && !checkCoupon(cart.couponCode).ok)
      return HttpResponse.json(
        { error: { code: 'COUPON_EXPIRED', message: 'O cupom aplicado não é mais válido.', details: { quote } } },
        { status: 409 },
      )
    if (quote.fingerprint !== body.quoteFingerprint)
      return HttpResponse.json(
        {
          error: {
            code: 'QUOTE_CHANGED',
            message: 'Os valores do pedido mudaram. Revise e confirme novamente.',
            details: { quote },
          },
        },
        { status: 409 },
      )

    // 5) Cria o pedido (snapshot imutável) e reserva estoque
    const nowIso = new Date().toISOString()
    const order: Order = {
      id: nextId('ord'),
      userId: auth.user.id,
      status: 'pending',
      lines: structuredClone(quote.lines),
      subtotal: quote.subtotal,
      discount: quote.discount,
      networkFee: quote.networkFee,
      total: quote.total,
      coupon: quote.coupon,
      network: body.network,
      wallet: { id: wallet!.id, label: wallet!.label, provider: wallet!.provider, address: wallet!.address },
      collector: body.collector,
      txHash: null,
      explorerUrl: null,
      rejectionReason: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      version: 1,
    }
    const touched = mutate((s) => {
      s.orders.push(order)
      s.idempotency.push({ key: idemKey, userId: auth.user.id, requestHash, orderId: order.id })
      const changed = new Set<string>()
      for (const line of order.lines) {
        const n = s.nfts.find((x) => x.id === line.nftId)!
        n.editions.find((e) => e.id === line.editionId)!.available -= line.quantity
        n.version++
        refreshNftPrice(n)
        changed.add(n.id)
      }
      return [...changed]
    })
    for (const id of touched) emitNftUpdated(db().nfts.find((n) => n.id === id)!)
    scheduleSettlement(order)

    // 6) Timeout após criação: o pedido existe, mas a resposta não chega a tempo
    if (isScenario('order-timeout') && once('order-timeout')) await delay(runtime.orderTimeoutDelayMs)

    return HttpResponse.json(order, { status: 201 })
  }),

  http.get(`${API}/orders/:id`, async ({ request, params }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const auth = authenticate(request)
    if ('response' in auth) return auth.response
    const order = db().orders.find((o) => o.id === params.id)
    // 404 (e não 403) para não revelar a existência de pedidos de outros usuários
    if (!order || order.userId !== auth.user.id) return apiError(404, 'NOT_FOUND', 'Pedido não encontrado.')
    return HttpResponse.json(order)
  }),

  http.get(`${API}/orders`, async ({ request }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const auth = authenticate(request)
    if ('response' in auth) return auth.response
    const status = new URL(request.url).searchParams.get('status')
    const orders = db()
      .orders.filter((o) => o.userId === auth.user.id && (!status || o.status === status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return HttpResponse.json(orders)
  }),
]

export { emptyCart }

