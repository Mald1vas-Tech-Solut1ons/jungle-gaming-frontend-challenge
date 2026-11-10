import { http, HttpResponse } from 'msw'
import { db, resetDb } from '../db'
import { dropConnections, emitStaleNftEvent, replayLastEvent, connectionCount } from '../realtime'
import { SCENARIOS, getScenario, setScenario } from '../scenarios'
import { settleOrder } from './commerce'
import { API } from '../support'

/**
 * Endpoints de controle da simulação (usados pelo Painel de Simulação e pelos
 * testes Playwright). Não fazem parte do domínio — são metadados de avaliação.
 */

export const controlHandlers = [
  http.get(`${API}/__mock/scenario`, () => {
    const scenario = getScenario()
    return HttpResponse.json({ scenario, label: SCENARIOS[scenario], scenarios: SCENARIOS })
  }),

  http.post(`${API}/__mock/scenario`, async ({ request }) => {
    const { scenario } = (await request.json().catch(() => ({}))) as { scenario?: string }
    if (!scenario || !(scenario in SCENARIOS))
      return HttpResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Cenário desconhecido.' } }, { status: 422 })
    setScenario(scenario as keyof typeof SCENARIOS)
    return HttpResponse.json({ scenario, label: SCENARIOS[scenario as keyof typeof SCENARIOS], scenarios: SCENARIOS })
  }),

  http.post(`${API}/__mock/reset`, async () => {
    await resetDb()
    return HttpResponse.json({ ok: true })
  }),

  http.post(`${API}/__mock/orders/:id/settle`, async ({ request, params }) => {
    const { outcome } = (await request.json().catch(() => ({}))) as { outcome?: 'confirmed' | 'rejected' }
    const order = settleOrder(String(params.id), outcome)
    if (!order) return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Pedido não encontrado ou já liquidado.' } }, { status: 404 })
    return HttpResponse.json(order)
  }),

  http.post(`${API}/__mock/realtime/replay`, async () => {
    const event = replayLastEvent()
    return HttpResponse.json({ ok: !!event })
  }),

  http.post(`${API}/__mock/realtime/stale`, async ({ request }) => {
    const { nftId } = (await request.json().catch(() => ({}))) as { nftId?: string }
    if (!nftId) return HttpResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'nftId obrigatório.' } }, { status: 422 })
    const event = emitStaleNftEvent(nftId)
    return HttpResponse.json({ ok: !!event })
  }),

  http.post(`${API}/__mock/realtime/drop`, async ({ request }) => {
    const { downMs } = (await request.json().catch(() => ({}))) as { downMs?: number }
    dropConnections(downMs ?? 0)
    return HttpResponse.json({ ok: true })
  }),

  http.get(`${API}/__mock/state`, () => {
    return HttpResponse.json({
      scenario: getScenario(),
      orders: db().orders.map((o) => ({ id: o.id, status: o.status })),
      connections: connectionCount(),
    })
  }),
]
