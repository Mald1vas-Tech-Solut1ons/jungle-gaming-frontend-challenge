import { api } from './api'
import type { Order } from '@/api/contracts'

/**
 * Controle de cenários de simulação (API `__mock`, ativa apenas com mocks).
 * Usado pelo Painel de Simulação e pelos testes Playwright.
 */

export interface ScenarioInfo {
  scenario: string
  label: string
  scenarios: Record<string, string>
}

export interface MockState {
  scenario: string
  orders: { id: string; status: string }[]
  connections: number
}

export async function fetchScenarioInfo(): Promise<ScenarioInfo> {
  const { data } = await api.get<ScenarioInfo>('/__mock/scenario')
  return data
}

export async function applyScenario(scenario: string): Promise<ScenarioInfo> {
  const { data } = await api.post<ScenarioInfo>('/__mock/scenario', { scenario })
  return data
}

export async function resetMockData(): Promise<void> {
  await api.post('/__mock/reset')
}

export async function settleOrderMock(orderId: string, outcome?: 'confirmed' | 'rejected'): Promise<Order> {
  const { data } = await api.post<Order>(`/__mock/orders/${orderId}/settle`, { outcome })
  return data
}

export async function replayLastEventMock(): Promise<{ ok: boolean }> {
  const { data } = await api.post<{ ok: boolean }>('/__mock/realtime/replay')
  return data
}

export async function emitStaleEventMock(nftId: string): Promise<{ ok: boolean }> {
  const { data } = await api.post<{ ok: boolean }>('/__mock/realtime/stale', { nftId })
  return data
}

export async function dropConnectionsMock(downMs?: number): Promise<{ ok: boolean }> {
  const { data } = await api.post<{ ok: boolean }>('/__mock/realtime/drop', { downMs })
  return data
}

export async function fetchMockState(): Promise<MockState> {
  const { data } = await api.get<MockState>('/__mock/state')
  return data
}
