import { chromium } from '@playwright/test'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log(`[console.error]`, msg.text().slice(0, 400))
})
page.on('pageerror', (err) => console.log('[pageerror]', String(err).slice(0, 1200)))

await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 40000 })
await page.waitForTimeout(5000)

const state = await page.evaluate(async () => {
  const res = await fetch('/api/__mock/state')
  return res.json()
})
console.log('[MOCK-STATE]', JSON.stringify(state))
const body = await page.evaluate(() => document.body.innerText.slice(0, 300).replace(/\n+/g, ' | '))
console.log('[BODY]', body)
await browser.close()
