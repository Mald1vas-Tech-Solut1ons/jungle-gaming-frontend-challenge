import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import '@fontsource/space-mono/400.css'
import '@fontsource/space-mono/700.css'
import '@fontsource/press-start-2p/400.css'
import './index.css'
import { queryClient } from './lib/query-client'
import { startRealtime } from './lib/socket'
import { router } from './router'

async function bootstrap() {
  // Mocks ativos por padrão (backend simulado da demo); desligue com VITE_ENABLE_MOCKS=false
  const { startMocks } = await import('./mocks/browser')
  await startMocks()

  await startRealtime()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void bootstrap()
