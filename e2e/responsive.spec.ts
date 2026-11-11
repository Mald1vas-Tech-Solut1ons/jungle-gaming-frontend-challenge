import { expect, test } from '@playwright/test'
import { openFilters, openSearch, setup } from './helpers'

/**
 * Área 8 do enunciado exige avaliar 390, 768 e 1440px. O tablet (768×1024)
 * não tem frame próprio no Figma, mas deve funcionar sem overflow horizontal
 * nem perda de conteúdo em todas as telas principais.
 */

test.use({ viewport: { width: 768, height: 1024 } })

test.beforeEach(async ({ page }) => {
  await setup(page)
})

test('tablet 768px: sem overflow horizontal nas telas principais', async ({ page }) => {
  const routes = ['/', '/nft/nft-001', '/cart', '/login', '/register']

  for (const route of routes) {
    await page.goto(route, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('scenario-panel-open')).toBeVisible()

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement
      return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth }
    })
    expect(overflow.scrollWidth, `${route} não deve ter overflow horizontal`).toBeLessThanOrEqual(overflow.clientWidth + 1)
  }
})

test('tablet 768px: catálogo navegável com filtros em gaveta', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.getByTestId('nft-card').first()).toBeVisible()

  // Sidebar vira gaveta (botão "Filtros") — filtros continuam combináveis
  const closeFilters = await openFilters(page)
  await page.getByTestId('filter-rarity-legendary').click()
  await expect(page).toHaveURL(/rarity/)
  await closeFilters()
  await expect(page.getByTestId('nft-card').first()).toBeVisible()

  // Busca pelo header na mesma largura
  await (await openSearch(page)).fill('ape')
  await expect(page.getByTestId('empty-state').or(page.getByTestId('nft-card').first())).toBeVisible()
})

test('tablet 768px: checkout em uma coluna sem perda de conteúdo', async ({ page }) => {
  const { login, addItemToCartApi, USERS } = await import('./helpers')
  await login(page, USERS.ana.email, USERS.ana.password)
  await addItemToCartApi(page, 'nft-001')
  await page.goto('/checkout', { waitUntil: 'networkidle' })
  await expect(page.getByTestId('checkout-fullName')).toBeVisible()
  await expect(page.getByTestId('quote-total')).toBeVisible()
  await expect(page.getByTestId('submit-order')).toBeVisible()

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})
