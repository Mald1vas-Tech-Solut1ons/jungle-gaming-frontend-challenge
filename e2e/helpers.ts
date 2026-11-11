import { expect, type Page } from '@playwright/test'

/** Credenciais fictícias (README). */
export const USERS = {
  ana: { email: 'ana@jungle.test', password: 'Senha@123' },
  bruno: { email: 'bruno@jungle.test', password: 'Senha@123' },
} as const

/** Latência fixa do cenário default (ms) — usada em waits ajustados. */
export const DEFAULT_LATENCY = 120

/**
 * Chama um endpoint de controle da simulação DENTRO do contexto da página
 * (o service worker do MSW intercepta o fetch; `page.request` vindo do Node
 * não passaria pelo worker).
 */
export async function mockApi(page: Page, path: string, body?: unknown): Promise<unknown> {
  const result = await page.evaluate(
    async ({ path, body }) => {
      const res = await fetch(`/api/__mock${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      const text = await res.text()
      return { status: res.status, body: text ? JSON.parse(text) : null }
    },
    { path, body },
  )
  return result
}

/** Restaura o estado conhecido da simulação (usuários, catálogo, carrinhos, pedidos). */
export async function resetState(page: Page) {
  await expect
    .poll(async () => (await mockApi(page, '/reset', {})) as { status: number }, { timeout: 10_000 })
    .toMatchObject({ status: 200 })
}

/** Seleciona um cenário de simulação pelo endpoint de controle. */
export async function setScenario(page: Page, scenario: string) {
  await expect
    .poll(
      async () =>
        (await mockApi(page, '/scenario', { scenario })) as { status: number; body: { scenario?: string } },
      { timeout: 10_000 },
    )
    .toMatchObject({ status: 200, body: { scenario } })
}

/** Estado atual da simulação: { scenario, orders, connections }. */
export async function getState(page: Page) {
  return (await mockApi(page, '/state')) as {
    status: number
    body: { scenario: string; orders: { id: string; status: string }[]; connections: number }
  }
}

/**
 * Espera o app terminar de inicializar (mocks + router). Usado no beforeEach
 * antes de resetar o estado pelo endpoint de controle.
 */
export async function waitForApp(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('scenario-panel-open')).toBeVisible()
}

/** Setup padrão de todo teste: app pronto + estado resetado + cenário default. */
export async function setup(page: Page) {
  await waitForApp(page)
  await resetState(page)
  await setScenario(page, 'default')
}

/** Login pela UI. Após o sucesso, navega de volta para a raiz. */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(email)
  await page.getByTestId('login-password').fill(password)
  await page.getByTestId('login-submit').click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByTestId('header-logout')).toBeVisible()
}

/** Sessão ativa? (token presente no localStorage). */
export async function isLoggedIn(page: Page) {
  return page.evaluate(() => localStorage.getItem('auth.token') !== null)
}

/** Logout pela UI. */
export async function logout(page: Page) {
  await page.getByTestId('header-logout').click()
  await expect(page.getByTestId('header-login')).toBeVisible()
}

/**
 * Adiciona um item ao carrinho pela API (dentro do contexto da página).
 * Usa a primeira edição disponível e respeita a sessão atual (token do
 * localStorage). Retorna `{nftId, editionId}` do item adicionado.
 */
export async function addItemToCartApi(
  page: Page,
  nftId: string,
  quantity = 1,
): Promise<{ nftId: string; editionId: string }> {
  const added = await page.evaluate(
    async ({ nftId, quantity }) => {
      const nftRes = await fetch(`/api/nfts/${nftId}`)
      const nft = (await nftRes.json()) as { editions: { id: string; available: number }[] }
      const edition = nft.editions.find((e) => e.available > 0)
      if (!edition) throw new Error(`NFT ${nftId} sem edições disponíveis`)
      // Espelha o interceptor do app: Authorization quando autenticado,
      // senão X-Guest-Cart-Id (id estável persistido no localStorage).
      const token = localStorage.getItem('auth.token')
      let guestId = localStorage.getItem('guest.cart-id')
      if (!token && !guestId) {
        guestId = crypto.randomUUID()
        localStorage.setItem('guest.cart-id', guestId)
      }
      const res = await fetch('/api/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : { 'X-Guest-Cart-Id': guestId! }),
        },
        body: JSON.stringify({ nftId, editionId: edition.id, quantity }),
      })
      if (res.status >= 400) throw new Error(`Falha ao adicionar ao carrinho: ${res.status}`)
      return { nftId, editionId: edition.id }
    },
    { nftId, quantity },
  )
  return added as { nftId: string; editionId: string }
}

/** Adiciona um item ao carrinho pela UI (página de detalhe). */
export async function addItemToCart(page: Page, nftId: string) {
  await page.goto(`/nft/${nftId}`)
  await page.getByTestId('add-to-cart').click()
  await expect(page.getByTestId('cart-count')).toBeVisible()
}

/** Converte '1.234,5678 ETH' → número (pt-BR); aceita sinal de menos tipográfico. */
export function parseEth(text: string | null): number {
  if (!text) throw new Error('Texto vazio para parseEth')
  const cleaned = text
    .replace(/\s*ETH\s*$/i, '')
    .replace(/[−–]/, '-')
    .replace(/\./g, '')
    .replace(',', '.')
  const value = Number(cleaned)
  if (Number.isNaN(value)) throw new Error(`parseEth falhou para "${text}"`)
  return value
}

/** Preço do primeiro card visível no catálogo. */
export async function firstCardPrice(page: Page): Promise<number> {
  const cards = page.getByTestId('nft-card')
  const text = await cards.first().locator('p.text-primary').textContent()
  return parseEth(text)
}

/** Lê um parâmetro de busca da URL (arrays do TanStack Router são JSON-encoded). */
export async function searchParam(page: Page, key: string): Promise<unknown> {
  return page.evaluate((k) => {
    const raw = new URLSearchParams(window.location.search).get(k)
    if (raw === null) return null
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }, key)
}

/** Espera um toast (sonner) com o texto dado e retorna o locator. */
export function toast(page: Page, text: string) {
  return page.locator('[data-sonner-toast]', { hasText: text })
}

/**
 * Preenche o formulário do colecionador no checkout com dados válidos
 * (e o país 'Brasil' — primeiro da lista).
 */
export async function fillCollector(page: Page, name = 'Ana Colecionadora', email = USERS.ana.email) {
  await page.getByTestId('checkout-fullName').fill(name)
  await page.getByTestId('checkout-email').fill(email)
  await page.getByTestId('checkout-country').click()
  await page.getByRole('option', { name: 'Brasil' }).click()
}

/** Vai para o checkout com o carrinho e formulário prontos (sem enviar). */
export async function prepareCheckout(page: Page) {
  await page.goto('/checkout')
  await expect(page.getByTestId('checkout-fullName')).toBeVisible()
  await fillCollector(page)
  await expect(page.getByTestId('quote-total')).toBeVisible()
  await expect(page.getByTestId('submit-order')).toBeEnabled()
}

/** Filtra a lista de pedidos do estado da simulação pelo status. */
export async function ordersByStatus(page: Page, status: string) {
  const state = await getState(page)
  return state.body.orders.filter((o) => o.status === status)
}

/** Total de pedidos na simulação. */
export async function orderCount(page: Page) {
  const state = await getState(page)
  return state.body.orders.length
}

/** Liquida um pedido pendente manualmente pelo endpoint de controle. */
export async function settleOrder(page: Page, orderId: string, outcome: 'confirmed' | 'rejected') {
  const result = (await mockApi(page, `/orders/${orderId}/settle`, { outcome })) as { status: number }
  expect(result.status).toBe(200)
}
