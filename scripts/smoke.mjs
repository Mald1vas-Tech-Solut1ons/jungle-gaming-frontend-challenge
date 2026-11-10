import { chromium } from '@playwright/test'

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:4173'
const errors = []
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})
page.on('pageerror', (err) => errors.push(String(err)))

try {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForSelector('[data-testid="nft-card"]', { timeout: 15000 })
  const cards = await page.locator('[data-testid="nft-card"]').count()
  const title = await page.title()
  const panel = await page.locator('[data-testid="scenario-panel-open"]').count()
  const header = await page.locator('[data-testid="header-logo"]').count()
  console.log(`HOME: title="${title}" cards=${cards} scenarioPanel=${panel} header=${header}`)

  await page.locator('[data-testid="nft-card"] a').first().click()
  await page.waitForSelector('[data-testid="nft-title"]', { timeout: 15000 })
  const addToCart = await page.locator('[data-testid="add-to-cart"]').count()
  const edition = await page.locator('[data-testid="edition-option"]').count()
  const gallery = await page.locator('[data-testid="gallery-main"]').count()
  console.log(`DETAIL: url=${page.url()} addToCart=${addToCart} editions=${edition} gallery=${gallery}`)

  if (addToCart) {
    await page.locator('[data-testid="add-to-cart"]').click()
    await page.waitForSelector('[data-testid="cart-count"]', { timeout: 10000 })
    console.log(`ADD-TO-CART: badge=${await page.locator('[data-testid="cart-count"]').textContent()}`)
  }

  await page.goto(`${BASE}/cart`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="cart-item"]', { timeout: 15000 })
  const items = await page.locator('[data-testid="cart-item"]').count()
  const total = await page.locator('[data-testid="cart-total"]').textContent()
  console.log(`CART: items=${items} total="${total}"`)

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="login-email"]', { timeout: 15000 })
  const demo = await page.locator('[data-testid="demo-credentials"]').count()
  console.log(`LOGIN: demoCredentials=${demo}`)

  await page.goto(`${BASE}/nft/nao-existe`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const nft404 = await page.locator('text=NFT não encontrado').count()
  console.log(`NFT-404: state=${nft404 > 0 ? 'OK' : 'MISSING'}`)

  console.log(`CONSOLE ERRORS: ${errors.length}`)
  for (const e of errors.slice(0, 10)) console.log('  -', e.slice(0, 200))
} catch (err) {
  console.log('SMOKE FAILED:', String(err).slice(0, 500))
  console.log(`CONSOLE ERRORS: ${errors.length}`)
  for (const e of errors.slice(0, 10)) console.log('  -', e.slice(0, 200))
  process.exitCode = 1
} finally {
  await browser.close()
}
