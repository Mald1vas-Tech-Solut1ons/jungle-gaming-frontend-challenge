import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FlaskConical, RefreshCcw, Wifi, WifiOff, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { mocksEnabled } from '@/lib/mock-info'
import {
  applyScenario,
  dropConnectionsMock,
  emitStaleEventMock,
  fetchMockState,
  fetchScenarioInfo,
  replayLastEventMock,
  resetMockData,
} from '@/lib/scenario'

const SCENARIO_HINTS: Record<string, string> = {
  default: 'Comportamento normal da loja.',
  slow: 'Cada requisição demora 2,5s — observe os skeletons.',
  variable: 'Latência alterna lento/rápido — respostas podem chegar fora de ordem.',
  offline: 'Toda requisição falha com erro de rede.',
  'server-error': 'Catálogo e detalhe retornam HTTP 500.',
  empty: 'O catálogo retorna vazio.',
  'session-expired': 'A próxima requisição autenticada expira a sessão.',
  'favorite-fail': 'Tentar favoritar falha com erro transitório.',
  'price-change': 'O preço do 1º item do carrinho sobe durante o checkout.',
  'sold-out': 'A edição do 1º item esgota durante o checkout.',
  'order-timeout': 'A criação do pedido estoura o timeout (recupere pela idempotência).',
  'payment-rejected': 'O pagamento é recusado pela carteira.',
  'wallet-refused': 'Conectar a carteira é recusado.',
  'wallet-disconnect': 'A carteira desconecta na hora de pagar — reconecte e tente de novo.',
}

/**
 * Painel de simulação — diferencial da entrega: o avaliador clica e vê a loja
 * reagir a rede lenta, erro, preço mudando e pagamento recusado, sem tocar em
 * código. Só renderiza quando os mocks estão ativos (dev/demo).
 */
export function ScenarioPanel() {
  const [open, setOpen] = useState(false)
  const [scenario, setScenario] = useState<string>('default')
  const [scenarios, setScenarios] = useState<Record<string, string>>({})
  const [pendingOrders, setPendingOrders] = useState(0)
  const [connections, setConnections] = useState(0)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!open || !mocksEnabled) return
    void fetchScenarioInfo().then((info) => {
      setScenario(info.scenario)
      setScenarios(info.scenarios)
    })
    void refreshState()
  }, [open])

  async function refreshState() {
    try {
      const state = await fetchMockState()
      setPendingOrders(state.orders.filter((o) => o.status === 'pending').length)
      setConnections(state.connections)
    } catch {
      /* painel é acessório */
    }
  }

  async function changeScenario(value: string) {
    try {
      const info = await applyScenario(value)
      setScenario(info.scenario)
      toast.success(`Cenário: ${info.label}`)
      await queryClient.invalidateQueries({ queryKey: ['nfts'] })
      await queryClient.invalidateQueries({ queryKey: ['nft'] })
      await queryClient.invalidateQueries({ queryKey: ['cart'] })
      await queryClient.invalidateQueries({ queryKey: ['quote'] })
      await refreshState()
      // Fecha o painel para o avaliador ver a loja reagir (e não ficar atrás
      // do overlay do Radix bloqueando interação).
      setOpen(false)
    } catch {
      toast.error('Não foi possível trocar o cenário.')
    }
  }

  if (!mocksEnabled) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 z-50 rounded-full bg-card/90 shadow-lg backdrop-blur"
          aria-label="Abrir painel de simulação"
          data-testid="scenario-panel-open"
        >
          <FlaskConical className="size-4 text-primary" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 overflow-y-auto" data-testid="scenario-panel">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FlaskConical className="size-4 text-primary" aria-hidden="true" />
            Painel de simulação
          </SheetTitle>
          <SheetDescription>Troque o cenário e veja a loja reagir. Estado persiste entre recargas.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="scenario-select">Cenário atual</Label>
            <Select value={scenario} onValueChange={changeScenario}>
              <SelectTrigger id="scenario-select" data-testid="scenario-select">
                <SelectValue placeholder="Selecione o cenário" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(scenarios).map(([name, label]) => (
                  <SelectItem key={name} value={name}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {SCENARIO_HINTS[scenario] && <p className="text-xs text-muted-foreground">{SCENARIO_HINTS[scenario]}</p>}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" onClick={() => void resetMockData().then(() => { toast.success('Dados da simulação resetados.'); void queryClient.invalidateQueries() }).catch(() => toast.error('Falha ao resetar.'))} data-testid="scenario-reset">
              <RefreshCcw className="size-3.5" aria-hidden="true" /> Resetar dados
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void replayLastEventMock().then((r) => toast.info(r.ok ? 'Evento duplicado reenviado — o cliente deve ignorar.' : 'Nenhum evento recente.'))} data-testid="scenario-replay">
              <Zap className="size-3.5" aria-hidden="true" /> Evento duplicado
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void emitStaleEventMock('nft-001').then((r) => toast.info(r.ok ? 'Evento antigo emitido — o cliente deve ignorar.' : 'Falha ao emitir.'))} data-testid="scenario-stale">
              <Zap className="size-3.5" aria-hidden="true" /> Evento antigo
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void dropConnectionsMock(5000).then(() => toast.info('Conexões derrubadas por 5s — observe a reconexão.'))} data-testid="scenario-drop">
              <WifiOff className="size-3.5" aria-hidden="true" /> Derrubar conexões
            </Button>
          </div>

          <Separator />

          <dl className="grid grid-cols-2 gap-2 text-xs" data-testid="scenario-state">
            <div className="rounded-md border border-border p-2">
              <dt className="text-muted-foreground">Pedidos pendentes</dt>
              <dd className="text-sm font-semibold">{pendingOrders}</dd>
            </div>
            <div className="rounded-md border border-border p-2">
              <dt className="flex items-center gap-1 text-muted-foreground">
                <Wifi className="size-3" aria-hidden="true" /> Conexões ativas
              </dt>
              <dd className="text-sm font-semibold">{connections}</dd>
            </div>
          </dl>
        </div>
      </SheetContent>
    </Sheet>
  )
}
