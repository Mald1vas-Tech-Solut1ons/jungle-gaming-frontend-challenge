import { expect, test } from '@playwright/test'
import { addItemToCartApi, fillCollector, login, setup, USERS } from './helpers'

/**
 * Regressão visual (chromium desktop 1440×900): início, detalhe, carrinho
 * (1 item determinístico) e pagamento (autenticado com item). Baselines em
 * e2e/snapshots/ (versionadas). Estado 100% determinístico: cenário default
 * + reset + fixtures fixas.
 *
 * Tolerância cross-platform: as baselines são geradas em Windows e o CI roda
 * em Linux — a rasterização do texto (Roboto Mono) difere ~1% entre SOs mesmo
 * com a mesma fonte. `maxDiffPixelRatio: 0.02` (2%) aceita essa variância de
 * antialiasing e continua reprovando regressões reais de layout/cor/estrutura
 * (que mudam dezenas de % dos pixels). Ver ARCHITECTURE §12.
 */
const TOLERANCE = { maxDiffPixelRatio: 0.02 }

test.beforeEach(async ({ page }) => {
  await setup(page)
})

test('visual: página inicial (catálogo + hero)', async ({ page }) => {
  await expect(page.getByTestId('nft-card').first()).toBeVisible()
  await expect(page.getByTestId('page-indicator')).toHaveText('Página 1 de 3')
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveScreenshot('home.png', TOLERANCE)
})

test('visual: página de detalhe do NFT', async ({ page }) => {
  await page.goto('/nft/nft-001')
  await expect(page.getByTestId('nft-title')).toBeVisible()
  await expect(page.getByTestId('gallery-main')).toBeVisible()
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveScreenshot('nft-detail.png', TOLERANCE)
})

test('visual: carrinho com um item', async ({ page }) => {
  await addItemToCartApi(page, 'nft-001')
  await page.goto('/cart')
  await expect(page.getByTestId('cart-item')).toHaveCount(1)
  await expect(page.getByTestId('cart-total')).toBeVisible()
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveScreenshot('cart.png', TOLERANCE)
})

test('visual: pagamento com item e carteira', async ({ page }) => {
  await login(page, USERS.ana.email, USERS.ana.password)
  await addItemToCartApi(page, 'nft-001')
  await page.goto('/checkout')
  await expect(page.getByTestId('checkout-fullName')).toBeVisible()
  await fillCollector(page)
  await expect(page.getByTestId('quote-total')).toBeVisible()
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveScreenshot('checkout.png', TOLERANCE)
})
