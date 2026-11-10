import { chromium } from '@playwright/test'

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:4173'
const errors = []
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text().slice(0, 150))
})
page.on('pageerror', (err) => errors.push(String(err).slice(0, 200)))

try {
  // 1. Login
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.fill('[data-testid="login-email"]', 'ana@jungle.test')
  await page.fill('[data-testid="login-password"]', 'Senha@123')
  await page.click('[data-testid="login-submit"]')
  await page.waitForURL(`${BASE}/`, { timeout: 15000 })
  console.log('LOGIN: OK')

  // 2. Adicionar NFT ao carrinho (autenticada)
  await page.goto(`${BASE}/nft/nft-001`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="add-to-cart"]', { timeout: 15000 })
  await page.click('[data-testid="add-to-cart"]')
  await page.waitForSelector('[data-testid="cart-count"]', { timeout: 10000 })
  console.log('ADD: badge =', await page.locator('[data-testid="cart-count"]').textContent())

  // 3. Checkout
  await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="checkout-fullName"]', { timeout: 15000 })
  await page.fill('[data-testid="checkout-fullName"]', 'Ana Colecionadora')
  await page.fill('[data-testid="checkout-email"]', 'ana@jungle.test')
  await page.locator('[data-testid="checkout-country"]').first().click()
  await page.keyboard.type('Brasil')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(800)
  const walletCount = await page.locator('[data-testid="checkout-wallet"]').count()
  console.log('CHECKOUT: wallets =', walletCount)
  if (walletCount > 0) await page.locator('[data-testid="checkout-wallet"]').first().click()

  // espera a cotação renderizar
  await page.waitForSelector('[data-testid="quote-total"]', { timeout: 15000 })
  console.log('QUOTE: total =', await page.locator('[data-testid="quote-total"]').textContent())

  await page.click('[data-testid="submit-order"]')
  await page.waitForURL(/\/orders\//, { timeout: 20000 })
  console.log('ORDER: url =', page.url())

  // 4. Aguardar confirmação (socket order.updated + fallback poll 2s)
  await page.waitForSelector('[data-testid="order-receipt"]', { timeout: 30000 })
  const status = await page.locator('[data-testid="order-status"]').textContent()
  const tx = await page.locator('[data-testid="order-tx"]').textContent()
  console.log(`ORDER CONFIRMED: status="${status?.trim()}" tx="${tx?.trim()}"`)

  // 5. Carrinho deve ter removido o item comprado
  await page.goto(`${BASE}/cart`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const cartEmpty = await page.locator('[data-testid="cart-empty"]').count()
  console.log('CART AFTER PURCHASE: empty =', cartEmpty > 0)

  console.log(`CONSOLE ERRORS: ${errors.length}`)
  for (const e of errors.slice(0, 6)) console.log('  -', e)
} catch (err) {
  console.log('CHECKOUT SMOKE FAILED:', String(err).slice(0, 600))
  console.log(`CONSOLE ERRORS: ${errors.length}`)
  for (const e of errors.slice(0, 6)) console.log('  -', e)
  process.exitCode = 1
} finally {
  await browser.close()
}
