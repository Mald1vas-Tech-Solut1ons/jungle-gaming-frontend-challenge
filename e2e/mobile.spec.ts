import { expect, test, type Page } from '@playwright/test'
import { fillCollector, searchParam, setup, USERS } from './helpers'

/**
 * Fluxos principais (áreas 1, 5 e 6) em viewport mobile 390×844.
 * Navegação pelo menu hambúrguer (o header colapsa abaixo de md).
 */

/** Abre o menu (hambúrguer) e clica em um link dentro do sheet. */
async function tapMenu(page: Page, testId: string) {
  await page.getByTestId('header-menu').click()
  await page.locator('[role="dialog"]').getByTestId(testId).click()
}

/** Grid do catálogo (o hero também renderiza `nft-card`). */
function grid(page: Page) {
  return page.getByTestId('nft-grid')
}

test.beforeEach(async ({ page }) => {
  await setup(page)
})

test('mobile — área 1: busca, filtro e paginação no catálogo', async ({ page }) => {
  await expect(grid(page).getByTestId('nft-card').first()).toBeVisible()

  // Busca com debounce
  await page.getByTestId('search-input').fill('Cosmic')
  await expect(page).toHaveURL(/[?&]q=Cosmic/)
  await expect(async () => {
    const names = await grid(page).getByTestId('nft-card-name').allTextContents()
    expect(names.length).toBe(3)
    for (const name of names) expect(name).toContain('Cosmic')
  }).toPass({ timeout: 8000 })
  await page.getByTestId('search-input').fill('')

  // Filtro por categoria
  await page.getByTestId('filter-category-gaming').click()
  await expect.poll(() => searchParam(page, 'category')).toEqual(['gaming'])
  await expect(async () => {
    expect(await grid(page).getByTestId('nft-card').count()).toBeGreaterThan(0)
  }).toPass({ timeout: 8000 })
  await page.getByTestId('clear-filters').first().click()

  // Paginação (36 itens → 3 páginas de 12)
  await expect(async () => {
    expect(await grid(page).getByTestId('nft-card').count()).toBe(12)
  }).toPass({ timeout: 8000 })
  await page.getByTestId('pagination-next').click()
  await expect(page.getByTestId('page-indicator')).toHaveText('Página 2 de 3')
})

test('mobile — área 5: carrinho via menu (adicionar, quantidade, remover)', async ({ page }) => {
  // Detalhe → adicionar ao carrinho
  await page.goto('/nft/nft-001')
  await page.getByTestId('add-to-cart').click()
  await expect(page.getByTestId('cart-count')).toHaveText('1')

  // Menu → Carrinho
  await tapMenu(page, 'header-cart')
  await expect(page).toHaveURL(/\/cart/)
  await expect(page.getByTestId('cart-item')).toHaveCount(1)

  // Quantidade e cupom funcionam na tela estreita
  await page.getByTestId('cart-qty-plus').click()
  await expect(page.getByTestId('cart-qty-input')).toHaveValue('2')
  await page.getByTestId('coupon-input').fill('JUNGLE10')
  await page.getByTestId('coupon-apply').click()
  await expect(page.getByTestId('cart-discount')).not.toHaveText('0 ETH')

  // Remover esvazia
  await page.getByTestId('cart-remove').click()
  await expect(page.getByTestId('cart-empty')).toBeVisible()
})

test('mobile — área 6: compra completa até o recibo confirmado', async ({ page }) => {
  test.setTimeout(90_000)
  // Login via menu
  await tapMenu(page, 'header-login')
  await expect(page).toHaveURL(/\/login/)
  await page.getByTestId('login-email').fill(USERS.ana.email)
  await page.getByTestId('login-password').fill(USERS.ana.password)
  await page.getByTestId('login-submit').click()
  await expect(page).toHaveURL(/\/$/)

  // Adicionar item
  await page.goto('/nft/nft-001')
  await page.getByTestId('add-to-cart').click()
  await expect(page.getByTestId('cart-count')).toHaveText('1')

  // Carrinho → pagamento
  await tapMenu(page, 'header-cart')
  await expect(page.getByTestId('cart-item')).toHaveCount(1)
  await page.getByTestId('checkout-button').click()
  await expect(page.getByTestId('checkout-fullName')).toBeVisible()
  await fillCollector(page)
  await expect(page.getByTestId('submit-order')).toBeEnabled()

  // Enviar → recibo
  await page.getByTestId('submit-order').click()
  await expect(page).toHaveURL(/\/orders\/ord-\d+/, { timeout: 15_000 })
  await expect(page.getByTestId('order-receipt')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('order-status')).toContainText('Pedido confirmado')
  await expect(page.getByTestId('order-tx')).toHaveText(/^0x[0-9a-f]{64}$/i)
})
