import { chromium } from '@playwright/test'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('[console.error]', msg.text().slice(0, 200))
})

await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 40000 })
await page.waitForTimeout(3000)

const result = await page.evaluate(async () => {
  const state = async () => {
    const res = await fetch('/api/__mock/state')
    return res.json()
  }
  const out = {}
  out.before = await state()

  const tryConnect = (url) =>
    new Promise((resolve) => {
      const ws = new WebSocket(url)
      ws.onopen = () => resolve('open')
      ws.onerror = () => resolve('error')
      ws.onclose = () => resolve('close')
      setTimeout(() => resolve('timeout'), 3000)
    })

  out.rawSocketIo = await tryConnect('wss://realtime.jungle.mock/socket.io/?EIO=4&transport=websocket')
  out.afterSocketIo = await state()

  out.rawOther = await tryConnect('wss://realtime.jungle.mock/outra-coisa')
  out.afterOther = await state()
  return out
})
console.log(JSON.stringify(result, null, 2))
await browser.close()
