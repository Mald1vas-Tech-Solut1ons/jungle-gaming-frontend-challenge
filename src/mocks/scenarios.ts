import { delay, HttpResponse } from 'msw'
import type { ApiErrorBody, ApiErrorCode } from '@/api/contracts'

/**
 * Cenários determinísticos selecionáveis por:
 *  - query string `?scenario=<nome>` (persistido)
 *  - painel de mocks na UI (dev/demo)
 *  - endpoint `POST /api/__mock/scenario` (testes Playwright)
 */
export const SCENARIOS = {
  default: 'Sucesso com latência normal',
  slow: 'Rede lenta (2,5s por requisição)',
  variable: 'Latência variável / respostas fora de ordem no catálogo',
  offline: 'Sem conexão (falha de rede)',
  'server-error': 'Catálogo e detalhe retornam HTTP 500',
  empty: 'Catálogo vazio',
  'session-expired': 'Próxima requisição autenticada retorna sessão expirada',
  'favorite-fail': 'Mutations de favoritos falham (500)',
  'price-change': 'Preço muda durante o checkout (na revalidação)',
  'sold-out': 'Edição esgota durante o checkout',
  'order-timeout': 'Criação do pedido estoura o timeout (recuperável por idempotência)',
  'payment-rejected': 'Pagamento recusado',
  'wallet-refused': 'Usuário recusa a conexão da carteira',
} as const

export type ScenarioName = keyof typeof SCENARIOS

const STORAGE_KEY = 'mock:scenario'

let current: ScenarioName = 'default'
let requestCounter = 0
/** Flag de "uma vez" para cenários que disparam apenas na primeira ocorrência */
const consumed = new Set<string>()

export function loadScenario() {
  const fromUrl = new URLSearchParams(window.location.search).get('scenario')
  if (fromUrl && fromUrl in SCENARIOS) {
    setScenario(fromUrl as ScenarioName)
    return
  }
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && stored in SCENARIOS) current = stored as ScenarioName
}

export function getScenario(): ScenarioName {
  return current
}

export function setScenario(name: ScenarioName) {
  current = name
  requestCounter = 0
  consumed.clear()
  localStorage.setItem(STORAGE_KEY, name)
}

export function isScenario(name: ScenarioName) {
  return current === name
}

/** Retorna true apenas na primeira chamada para a chave no cenário atual. */
export function once(key: string): boolean {
  if (consumed.has(key)) return false
  consumed.add(key)
  return true
}

export function apiError(status: number, code: ApiErrorCode, message: string, fields?: Record<string, string>) {
  const body: ApiErrorBody = { error: { code, message, ...(fields ? { fields } : {}) } }
  return HttpResponse.json(body, { status })
}

export function getLatency(kind: 'catalog' | 'default' = 'default'): number {
  if (current === 'slow') return 2500
  if (current === 'variable' && kind === 'catalog') {
    // Alterna lento/rápido: a requisição N (lenta) termina depois da N+1 (rápida)
    requestCounter++
    return requestCounter % 2 === 1 ? 1500 : 200
  }
  // Latência normal pequena e fixa (estável para baselines)
  return 120
}

/**
 * Aplica latência e falhas globais. Retorna uma Response quando a requisição
 * deve falhar, ou `undefined` para seguir com o handler.
 */
export async function simulateNetwork(kind: 'catalog' | 'default' = 'default') {
  if (current === 'offline') {
    await delay(100)
    return HttpResponse.error()
  }
  await delay(getLatency(kind))
  return undefined
}

