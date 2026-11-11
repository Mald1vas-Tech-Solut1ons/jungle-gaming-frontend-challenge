import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/montserrat/800.css'
import './index.css'
import { queryClient } from './lib/query-client'
import { startRealtime } from './lib/socket'
import { router } from './router'

async function bootstrap() {
  // Mocks ativos por padrão (backend simulado da demo); desligue com VITE_ENABLE_MOCKS=false
  const { startMocks } = await import('./mocks/browser')
  await startMocks()

  // Socket não bloqueia o primeiro paint: conecta durante o idle e a
  // reconciliação pós-conexão cobre eventos perdidos no intervalo.
  void startRealtime()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void bootstrap()
