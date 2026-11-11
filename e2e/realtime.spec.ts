import { expect, test, type Page } from '@playwright/test'
import {
  addItemToCartApi,
  fillCollector,
  getState,
  login,
  mockApi,
  parseEth,
  setScenario,
  setup,
  USERS,
} from './helpers'

/**
 * Área 9: mudança de preço/disponibilidade via Socket.IO durante o checkout
 * (QUOTE_CHANGED / AVAILABILITY_CONFLICT com confirmação explícita).
 * Área 10: eventos duplicados/antigos ignorados, desconexão e retomada de
 * pedido pendente (settle manual + refresh).
 */

test.beforeEach(async ({ page }) => {
  await setup(page)
})

async function checkoutReady(page: Page) {
  await login(page, USERS.ana.email, USERS.ana.password)
  await addItemToCartApi(page, 'nft-001')
  await page.goto('/checkout')
  await expect(page.getByTestId('checkout-fullName')).toBeVisible()
  await fillCollector(page)
  await expect(page.getByTestId('quote-total')).toBeVisible()
  await expect(page.getByTestId('submit-order')).toBeEnabled()
}

test('preço muda durante o checkout: 409 QUOTE_CHANGED → confirmação → pedido com valores novos', async ({ page }) => {
  await checkoutReady(page)
  const originalTotal = parseEth(await page.getByTestId('quote-total').textContent())

  await setScenario(page, 'price-change')
  await page.getByTestId('submit-order').click()

  // Conflito exibido com cotação nova e reexigência de confirmação explícita
  await expect(page.getByRole('heading', { name: 'Os valores do pedido mudaram' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('confirm-changes')).toBeVisible()
  await expect(page.getByTestId('submit-order')).toBeDisabled()

  // A cotação exibida foi atualizada (+10% no 1º item)
  const updatedTotal = parseEth(await page.getByTestId('quote-total').textContent())
  expect(updatedTotal).toBeGreaterThan(originalTotal)

  // Confirma explicitamente e reenvia → pedido criado com os valores novos
  await page.getByTestId('confirm-changes').click()
  await expect(page.getByTestId('submit-order')).toBeEnabled()
  await page.getByTestId('submit-order').click()

  await expect(page).toHaveURL(/\/orders\/ord-\d+/, { timeout: 15_000 })
  await expect(page.getByTestId('order-receipt')).toBeVisible({ timeout: 30_000 })
  const receiptTotal = parseEth(await page.locator('[data-testid="order-receipt"] dl dd').last().textContent())
  expect(receiptTotal).toBeCloseTo(updatedTotal, 4)
})

test('edição esgota durante o checkout: AVAILABILITY_CONFLICT explícito', async ({ page }) => {
  await checkoutReady(page)

  await setScenario(page, 'sold-out')
  await page.getByTestId('submit-order').click()

  await expect(page.getByText('Os valores do pedido mudaram')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Alguns itens não estão mais disponíveis na quantidade solicitada.')).toBeVisible()
  await expect(page.getByTestId('confirm-changes')).toBeVisible()
  await expect(page.getByTestId('submit-order')).toBeDisabled()

  // O estoque da edição foi consumido (esgota no servidor)
  const soldOut = await page.evaluate(async () => {
    const res = await fetch('/api/nfts/nft-001')
    const nft = (await res.json()) as { editions: { id: string; available: number }[] }
    return nft.editions.every((e) => e.available === 0) || nft.editions.some((e) => e.available === 0)
  })
  expect(soldOut).toBe(true)
})

test('evento duplicado (replay) e evento antigo (stale) são ignorados: preço não regride', async ({ page }) => {
  await login(page, USERS.ana.email, USERS.ana.password)
  // Compra gera eventos nft.updated reais para nft-001
  await addItemToCartApi(page, 'nft-001')
  await page.goto('/checkout')
  await fillCollector(page)
  await expect(page.getByTestId('submit-order')).toBeEnabled()
  await page.getByTestId('submit-order').click()
  await expect(page).toHaveURL(/\/orders\/ord-\d+/, { timeout: 15_000 })
  await expect(page.getByTestId('order-receipt')).toBeVisible({ timeout: 30_000 })

  // Abre o detalhe e captura o preço estável
  await page.goto('/nft/nft-001')
  await expect(page.getByTestId('nft-price')).toBeVisible()
  const price = await page.getByTestId('nft-price').textContent()

  // Duplicata exata do último evento: cliente deduplica (nenhuma mudança)
  await mockApi(page, '/realtime/replay', {})
  await page.waitForTimeout(800)
  await expect(page.getByTestId('nft-price')).toHaveText(price!)

  // Evento com versão antiga (payload de preço 999 ETH): ignorado
  await mockApi(page, '/realtime/stale', { nftId: 'nft-001' })
  await page.waitForTimeout(800)
  await expect(page.getByTestId('nft-price')).toHaveText(price!)
  expect(price).not.toContain('999')
})

test('desconexão: liquidação manual de pedido pendente reflete na UI após reconexão', async ({ page }) => {
  await checkoutReady(page)

  await page.getByTestId('submit-order').click()
  await expect(page).toHaveURL(/\/orders\/ord-\d+/, { timeout: 15_000 })
  const orderId = new URL(page.url()).pathname.split('/').pop()!

  // Derruba as conexões por 6s e liquida o pedido manualmente enquanto cai
  await mockApi(page, '/realtime/drop', { downMs: 6000 })
  await mockApi(page, `/orders/${orderId}/settle`, { outcome: 'confirmed' })

  // Sem socket, a página continua pendente…
  await expect(page.getByTestId('order-status')).toContainText('Aguardando confirmação')

  // …mas o poll (2s) e a reconciliação pós-reconexão trazem a confirmação
  await expect(page.getByTestId('order-receipt')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('order-status')).toContainText('Pedido confirmado')

  // A conexão de tempo real voltou
  await expect(async () => {
    const state = await getState(page)
    expect(state.body.connections).toBeGreaterThanOrEqual(1)
  }).toPass({ timeout: 15_000 })

  // Exatamente um pedido, confirmado
  const state = await getState(page)
  expect(state.body.orders).toHaveLength(1)
  expect(state.body.orders[0].status).toBe('confirmed')
})

test('refresh da página com pedido pendente retoma e confirma', async ({ page }) => {
  await checkoutReady(page)
  await page.getByTestId('submit-order').click()
  await expect(page).toHaveURL(/\/orders\/ord-\d+/, { timeout: 15_000 })

  // Recarrega imediatamente (pedido ainda pendente na simulação)
  await page.reload()
  await expect(page.getByTestId('order-status')).toBeVisible()

  // A liquidação agendada confirma o pedido e a UI acompanha
  await expect(page.getByTestId('order-receipt')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('order-status')).toContainText('Pedido confirmado')
  const state = await getState(page)
  expect(state.body.orders).toHaveLength(1)
  expect(state.body.orders[0].status).toBe('confirmed')
})
