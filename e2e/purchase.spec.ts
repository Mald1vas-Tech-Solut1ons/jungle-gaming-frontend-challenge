import { expect, test } from '@playwright/test'
import {
  addItemToCartApi,
  fillCollector,
  getState,
  login,
  orderCount,
  parseEth,
  setScenario,
  settleOrder,
  setup,
  USERS,
} from './helpers'

/**
 * Área 6: compra completa — catálogo → carrinho → checkout → recibo
 * confirmado com tx hash. Área 7: pagamento recusado (status + motivo),
 * proteção contra clique repetido (idempotência) e timeout com recuperação
 * do MESMO pedido.
 */

test.beforeEach(async ({ page }) => {
  await setup(page)
})

async function purchaseSetup(page: import('@playwright/test').Page) {
  await login(page, USERS.ana.email, USERS.ana.password)
  await addItemToCartApi(page, 'nft-001')
  await page.goto('/checkout')
  await expect(page.getByTestId('checkout-fullName')).toBeVisible()
  await fillCollector(page)
  await expect(page.getByTestId('quote-total')).toBeVisible()
  await expect(page.getByTestId('submit-order')).toBeEnabled()
}

test('compra completa: do catálogo ao recibo confirmado com tx hash', async ({ page }) => {
  // Catálogo → detalhe → adicionar (fluxo pela UI)
  await login(page, USERS.ana.email, USERS.ana.password)
  await page.getByTestId('nft-grid').getByTestId('nft-card').first().click()
  await expect(page.getByTestId('nft-title')).toBeVisible()
  await page.getByTestId('add-to-cart').click()
  await expect(page.getByTestId('cart-count')).toHaveText('1')

  // Carrinho → checkout
  await page.getByTestId('header-cart').click()
  await expect(page.getByTestId('cart-item')).toHaveCount(1)
  const cartTotal = parseEth(await page.getByTestId('cart-total').textContent())
  await page.getByTestId('checkout-button').click()

  await expect(page.getByTestId('checkout-fullName')).toBeVisible()
  await fillCollector(page)
  await expect(page.getByTestId('quote-total')).toBeVisible()
  const quoteTotal = parseEth(await page.getByTestId('quote-total').textContent())
  expect(quoteTotal).toBeCloseTo(cartTotal, 4) // mesma cotação (rede default)

  // Enviar pedido → página do pedido
  await page.getByTestId('submit-order').click()
  await expect(page).toHaveURL(/\/orders\/ord-\d+/, { timeout: 15_000 })
  await expect(page.getByTestId('order-status')).toBeVisible()

  // Confirmação chega via socket (ou poll): recibo com tx hash válido
  await expect(page.getByTestId('order-receipt')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('order-status')).toContainText('Pedido confirmado')
  const tx = await page.getByTestId('order-tx').textContent()
  expect(tx!.trim()).toMatch(/^0x[0-9a-f]{64}$/i)

  // Recibo preserva o snapshot da cotação
  const receiptTotal = parseEth(await page.getByTestId('receipt-total').textContent())
  expect(receiptTotal).toBeCloseTo(quoteTotal, 4)
  await expect(page.getByTestId('order-receipt')).toContainText('Ana Colecionadora')
  await expect(page.getByTestId('order-receipt')).toContainText('MetaMask principal')

  // Carrinho esvaziado após a confirmação (tela standalone: navega direto)
  await page.goto('/cart')
  await expect(page.getByTestId('cart-empty')).toBeVisible()
  await expect(page.getByTestId('cart-count')).toHaveCount(0)

  // Estado da simulação: exatamente 1 pedido confirmado
  const state = await getState(page)
  expect(state.body.orders).toHaveLength(1)
  expect(state.body.orders[0].status).toBe('confirmed')
})

test('pagamento recusado: status recusado com motivo e retorno ao carrinho', async ({ page }) => {
  await setScenario(page, 'payment-rejected')
  await purchaseSetup(page)

  await page.getByTestId('submit-order').click()
  await expect(page).toHaveURL(/\/orders\/ord-\d+/, { timeout: 15_000 })

  await expect(page.getByTestId('order-status')).toContainText('Pagamento recusado', { timeout: 30_000 })
  await expect(page.getByTestId('order-status')).toContainText('Pagamento recusado pela carteira (saldo insuficiente na simulação).')
  await expect(page.getByTestId('back-to-cart')).toBeVisible()

  const state = await getState(page)
  expect(state.body.orders).toHaveLength(1)
  expect(state.body.orders[0].status).toBe('rejected')
})

test('clique repetido no envio cria UM único pedido (idempotência)', async ({ page }) => {
  await purchaseSetup(page)

  // Dois cliques síncronos no mesmo tick (antes do React desabilitar o botão)
  await page.evaluate(() => {
    const button = document.querySelector<HTMLButtonElement>('[data-testid="submit-order"]')!
    button.click()
    button.click()
  })

  await expect(page).toHaveURL(/\/orders\/ord-\d+/, { timeout: 20_000 })
  await expect(page.getByTestId('order-receipt')).toBeVisible({ timeout: 30_000 })

  // O servidor registrou um único pedido
  await expect(async () => {
    expect(await orderCount(page)).toBe(1)
  }).toPass({ timeout: 10_000 })
})

test('timeout na criação: recuperação retoma o MESMO pedido, sem duplicar', async ({ page }) => {
  test.setTimeout(120_000)
  await setScenario(page, 'order-timeout')
  await purchaseSetup(page)

  await page.getByTestId('submit-order').click()

  // Cliente estoura o timeout (8s) e oferece verificação do status
  await expect(page.getByText('O servidor demorou para responder')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('recover-order')).toBeVisible()

  await page.getByTestId('recover-order').click()
  await expect(page).toHaveURL(/\/orders\/ord-\d+/, { timeout: 20_000 })

  // Pedido pendente (a liquidação automática fica suspensa no cenário)
  await expect(page.getByTestId('order-status')).toContainText('Aguardando', { timeout: 15_000 })

  // Liquida manualmente pelo endpoint de controle → evento realtime → recibo
  const orderId = new URL(page.url()).pathname.split('/').pop()!
  await settleOrder(page, orderId, 'confirmed')
  await expect(page.getByTestId('order-receipt')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('order-status')).toContainText('Pedido confirmado')

  // Exatamente UM pedido na simulação — a mesma Idempotency-Key o recuperou
  await expect(async () => {
    expect(await orderCount(page)).toBe(1)
  }).toPass({ timeout: 10_000 })
  const state = await getState(page)
  expect(state.body.orders[0].id).toBe(orderId)
})

test('edição de quantidade no detalhe respeita o limite antes do carrinho', async ({ page }) => {
  await page.goto('/nft/nft-001')
  await expect(page.getByTestId('add-to-cart')).toBeVisible()

  const input = page.getByTestId('quantity-input')
  const plus = page.getByTestId('quantity-plus')
  await expect(input).toHaveValue('1')

  await plus.click()
  await expect(input).toHaveValue('2')

  // Edição 1/50 da nft-001: máx. 5 por pedido → botão desabilita no limite
  for (let i = 0; i < 3; i++) await plus.click()
  await expect(input).toHaveValue('5')
  await expect(plus).toBeDisabled()

  // Comprar agora leva ao carrinho com a quantidade escolhida
  await page.getByTestId('buy-now').click()
  await expect(page).toHaveURL(/\/cart/)
  await expect(page.getByTestId('cart-qty-input')).toHaveValue('5')
})
