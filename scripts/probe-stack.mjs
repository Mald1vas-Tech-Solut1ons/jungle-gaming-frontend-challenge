import { chromium } from '@playwright/test'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', async (msg) => {
  if (msg.type() !== 'error') return
  const parts = []
  for (const arg of msg.args()) {
    try {
      const value = await arg.jsonValue()
      parts.push(typeof value === 'string' ? value : JSON.stringify(value))
    } catch {
      parts.push('<não serializável>')
    }
  }
  console.log('[console.error]', parts.join(' | ').slice(0, 3000))
})
await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 40000 })
await page.waitForTimeout(4000)
await browser.close()
