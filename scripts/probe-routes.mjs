import { chromium } from '@playwright/test'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const routes = ['/', '/login', '/cart', '/nft/nft-001', '/profile']
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
let crashed = 0
page.on('pageerror', () => {
  crashed++
})

for (const route of routes) {
  crashed = 0
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2500)
  } catch {
    /* timeout não é crash */
  }
  const body = await page.evaluate(() => document.body.innerText.slice(0, 120).replace(/\n+/g, ' | '))
  const slotError = body.includes('Expected a single React element child')
  console.log(`${route}: crash=${crashed} slotError=${slotError} body="${body.slice(0, 80)}"`)
}
await browser.close()
