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
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // A Confirmação de Pedido é uma tela standalone no Figma (sem header/footer)
  const isStandalone = pathname.startsWith('/orders/')
  return (
    <div className="flex min-h-svh flex-col">
      <ScrollRestoration />
      {!isStandalone && <Header />}
      <main
        className={
          isStandalone
            ? 'mx-auto flex w-full max-w-[1200px] flex-1 items-start justify-center px-4 py-10'
            : 'mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 xl:px-0'
        }
        id="conteudo"
      >
        <Outlet />
      </main>
      {!isStandalone && <Footer />}
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
