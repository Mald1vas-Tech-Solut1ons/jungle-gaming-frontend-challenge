import Decimal from 'decimal.js'
import { http, HttpResponse } from 'msw'
import type { Chain, FavoritesResponse, Nft, NftCategory, NftFacets, NftListResponse, NftRarity, NftSort } from '@/api/contracts'
import { db, mutate } from '../db'
import { apiError, isScenario, simulateNetwork } from '../scenarios'
import { API, authenticate } from '../support'

const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : [])

const CATEGORY_KEYS: readonly NftCategory[] = ['art', 'photography', 'music', 'collectibles', 'gaming', 'utility']
const RARITY_KEYS: readonly NftRarity[] = ['common', 'rare', 'epic', 'legendary']
const CHAIN_KEYS: readonly Chain[] = ['ethereum', 'polygon', 'solana']

export const catalogHandlers = [
  http.get(`${API}/nfts`, async ({ request }) => {
    const fail = await simulateNetwork('catalog')
    if (fail) return fail
    if (isScenario('server-error')) return apiError(500, 'INTERNAL_ERROR', 'Erro ao carregar o catálogo.')

    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.trim().toLowerCase() ?? ''
    const categories = list(url.searchParams.get('category')) as NftCategory[]
    const rarities = list(url.searchParams.get('rarity')) as NftRarity[]
    const chains = list(url.searchParams.get('chain')) as Chain[]
    const minPrice = url.searchParams.get('minPrice')
    const maxPrice = url.searchParams.get('maxPrice')
    const featured = url.searchParams.get('featured') === 'true'
    const sort = (url.searchParams.get('sort') ?? 'recent') as NftSort
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1)
    const pageSize = Math.min(48, Math.max(1, Number(url.searchParams.get('pageSize') ?? 12) || 12))

    const all: Nft[] = isScenario('empty') ? [] : [...db().nfts]
    const hasMin = !!minPrice && !Number.isNaN(Number(minPrice))
    const hasMax = !!maxPrice && !Number.isNaN(Number(maxPrice))

    // Predicados por grupo: as contagens (facets) de um grupo aplicam todos os
    // outros filtros, menos o do próprio grupo.
    const base = (n: Nft) =>
      (!featured || n.featured) &&
      (!q || [n.name, n.collection, n.creator].some((f) => f.toLowerCase().includes(q))) &&
      (!hasMin || new Decimal(n.price).gte(minPrice!)) &&
      (!hasMax || new Decimal(n.price).lte(maxPrice!))
    const byCategory = (n: Nft) => !categories.length || categories.includes(n.category)
    const byRarity = (n: Nft) => !rarities.length || rarities.includes(n.rarity)
    const byChain = (n: Nft) => !chains.length || chains.includes(n.chain)

    const count = <K extends string>(keys: readonly K[], pick: (n: Nft) => K, rows: Nft[]) => {
      const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>
      for (const n of rows) out[pick(n)]++
      return out
    }
    const prices = all.map((n) => new Decimal(n.price))
    const facets: NftFacets = {
      category: count(CATEGORY_KEYS, (n) => n.category, all.filter((n) => base(n) && byRarity(n) && byChain(n))),
      rarity: count(RARITY_KEYS, (n) => n.rarity, all.filter((n) => base(n) && byCategory(n) && byChain(n))),
      chain: count(CHAIN_KEYS, (n) => n.chain, all.filter((n) => base(n) && byCategory(n) && byRarity(n))),
      price: {
        min: prices.length ? Decimal.min(...prices).toString() : '0',
        max: prices.length ? Decimal.max(...prices).toString() : '0',
      },
    }

    const items = all.filter((n) => base(n) && byCategory(n) && byRarity(n) && byChain(n))

    const byPrice = (a: Nft, b: Nft) => new Decimal(a.price).comparedTo(b.price)
    const sorters: Record<NftSort, (a: Nft, b: Nft) => number> = {
      recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
      price_asc: (a, b) => byPrice(a, b) || a.id.localeCompare(b.id),
      price_desc: (a, b) => byPrice(b, a) || a.id.localeCompare(b.id),
      popular: (a, b) => b.likes - a.likes || a.id.localeCompare(b.id),
      name: (a, b) => a.name.localeCompare(b.name),
    }
    items.sort(sorters[sort] ?? sorters.recent)

    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const body: NftListResponse = {
      items: items.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total,
      totalPages,
      facets,
    }
    return HttpResponse.json(body)
  }),

  http.get(`${API}/nfts/:id`, async ({ params }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    if (isScenario('server-error')) return apiError(500, 'INTERNAL_ERROR', 'Erro ao carregar o NFT.')
    const nft = db().nfts.find((n) => n.id === params.id)
    if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    return HttpResponse.json(nft)
  }),

  // ---------- Favoritos ----------
  http.get(`${API}/favorites`, async ({ request }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const auth = authenticate(request)
    if ('response' in auth) return auth.response
    return HttpResponse.json<FavoritesResponse>({ nftIds: db().favorites[auth.user.id] ?? [] })
  }),

  http.put(`${API}/favorites/:nftId`, async ({ request, params }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const auth = authenticate(request)
    if ('response' in auth) return auth.response
    if (isScenario('favorite-fail')) return apiError(500, 'TRANSIENT_FAILURE', 'Não foi possível salvar o favorito.')
    const nftId = String(params.nftId)
    if (!db().nfts.some((n) => n.id === nftId)) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    const ids = mutate((s) => {
      const arr = (s.favorites[auth.user.id] ??= [])
      if (!arr.includes(nftId)) {
        arr.push(nftId)
        s.nfts.find((n) => n.id === nftId)!.likes++
      }
      return [...arr]
    })
    return HttpResponse.json<FavoritesResponse>({ nftIds: ids })
  }),

  http.delete(`${API}/favorites/:nftId`, async ({ request, params }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const auth = authenticate(request)
    if ('response' in auth) return auth.response
    if (isScenario('favorite-fail')) return apiError(500, 'TRANSIENT_FAILURE', 'Não foi possível remover o favorito.')
    const nftId = String(params.nftId)
    const ids = mutate((s) => {
      const arr = s.favorites[auth.user.id] ?? []
      if (arr.includes(nftId)) {
        const nft = s.nfts.find((n) => n.id === nftId)
        if (nft) nft.likes = Math.max(0, nft.likes - 1)
      }
      s.favorites[auth.user.id] = arr.filter((x) => x !== nftId)
      return s.favorites[auth.user.id]
    })
    return HttpResponse.json<FavoritesResponse>({ nftIds: ids })
  }),
]

