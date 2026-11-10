import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { NotFoundPage } from '@/components/layout/not-found'
import { RealtimeToasts } from '@/components/layout/realtime-toasts'
import { ScenarioPanel } from '@/components/layout/scenario-panel'

/** Restaura o scroll ao topo em troca de rota (sem âncoras). */
function ScrollRestoration() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  return null
}

function RootComponent() {
  return (
    <div className="flex min-h-svh flex-col">
      <ScrollRestoration />
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6" id="conteudo">
        <Outlet />
      </main>
      <Footer />
      <ScenarioPanel />
      <RealtimeToasts />
      <Toaster position="top-center" theme="dark" richColors closeButton />
    </div>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundPage,
})
