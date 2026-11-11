import { setupWorker } from 'msw/browser'
import { mocksEnabled } from '@/lib/mock-info'
import { initDb } from './db'
import { loadScenario } from './scenarios'
import { handlers } from './handlers'
import { realtimeHandlers } from './realtime'
import { resumePendingOrders } from './handlers/commerce'

/**
 * Ativação dos mocks por configuração: `VITE_ENABLE_MOCKS !== 'false'`.
 * A demo publicada roda SEMPRE com mocks (o backend é a própria simulação).
 */
export const worker = setupWorker(...handlers, ...realtimeHandlers)

export async function initMockBackend() {
  await initDb()
  loadScenario()
  resumePendingOrders()
}

export async function startMocks() {
  if (!mocksEnabled) return
  await initMockBackend()
  await worker.start({
    onUnhandledRequest: 'bypass',
    // Sem log por requisição no console: em CPU limitada (mobile) o
    // console.group de cada resposta mockada custa tempo de main thread.
    quiet: true,
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
}
