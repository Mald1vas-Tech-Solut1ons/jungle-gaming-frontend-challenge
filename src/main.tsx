import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import '@fontsource-variable/roboto-mono/wght.css'
import './index.css'
import { mocksEnabled } from './lib/mock-info'
import { markMocksReady } from './lib/mocks-ready'
import { queryClient } from './lib/query-client'
import { startRealtime } from './lib/socket'
import { router } from './router'

// Primeiro paint sem esperar o backend simulado: o layout e o hero renderizam
// já; as requisições REST aguardam `mocksReady` no interceptor do Axios.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)

async function bootMocks() {
  if (mocksEnabled) {
    // Mocks ativos por padrão (backend simulado da demo); desligue com VITE_ENABLE_MOCKS=false
    const { startMocks, reclaimWorker } = await import('./mocks/browser')
    await startMocks()
    markMocksReady()
    // O navegador pode encerrar o service worker do MSW quando a aba fica em
    // segundo plano; ao voltar, reativa o worker e revalida as consultas para
    // que as chamadas /api voltem a ser interceptadas (senão caem no Vercel).
    const recoverMocks = () => {
      if (document.visibilityState === 'visible') {
        void reclaimWorker().then(() => queryClient.invalidateQueries())
      }
    }
    document.addEventListener('visibilitychange', recoverMocks)
    window.addEventListener('pageshow', recoverMocks)
  } else {
    markMocksReady()
  }
  // Socket não bloqueia o primeiro paint: a reconciliação pós-conexão cobre
  // eventos perdidos no intervalo.
  void startRealtime()
}

void bootMocks()
