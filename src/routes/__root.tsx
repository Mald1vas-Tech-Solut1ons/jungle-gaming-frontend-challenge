import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { BottomNav } from '@/components/layout/bottom-nav'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { NotFoundPage } from '@/components/layout/not-found'
import { RealtimeToasts } from '@/components/layout/realtime-toasts'
import { ScenarioPanel } from '@/components/layout/scenario-panel'
import { SessionExpiryRedirect } from '@/components/layout/session-expiry-redirect'
import { useIsMobile } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'

/** Restaura o scroll ao topo em troca de rota (sem âncoras). */
function ScrollRestoration() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

/** Telas mobile que mostram a barra de navegação inferior (demais têm CTA próprio). */
const BOTTOM_NAV_ROUTES = new Set(['/', '/profile', '/wallets'])

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isMobile = useIsMobile()
  // A Confirmação de Pedido é um cartão central sem header/footer no layout.
  const isStandalone = pathname.startsWith('/orders/')
  const showChrome = !isMobile && !isStandalone
  const showBottomNav = isMobile && BOTTOM_NAV_ROUTES.has(pathname)

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#conteudo"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[60] focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-4 focus-visible:py-2 focus-visible:font-bold focus-visible:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <ScrollRestoration />
      {showChrome && <Header />}
      <main
        id="conteudo"
        tabIndex={-1}
        className={cn(
          'page-container flex-1 outline-none',
          // Rodapé sempre abaixo da dobra: a troca skeleton → conteúdo não o empurra (CLS)
          showChrome && 'min-h-[calc(100svh-69px)]',
          isStandalone ? 'flex items-start justify-center py-6 md:py-24' : 'pt-4 md:pt-6',
          showBottomNav && 'pb-28',
        )}
      >
        <Outlet />
      </main>
      {showChrome && <Footer />}
      {showBottomNav && <BottomNav />}
      <ScenarioPanel />
      <RealtimeToasts />
      <SessionExpiryRedirect />
      <Toaster
        position="top-center"
        // No mobile, abaixo das barras de topo (voltar/carrinho) para não cobri-las
        mobileOffset={{ top: 64 }}
        theme="dark"
        closeButton
        toastOptions={{
          classNames: {
            toast: '!rounded-md !border-rule !bg-card !font-sans !text-foreground !shadow-[0_18px_40px_-12px_rgb(0_0_0_/_0.7)]',
            description: '!text-muted-foreground',
            closeButton: '!border-rule !bg-card !text-foreground',
            success: '!border-l-4 !border-l-success',
            error: '!border-l-4 !border-l-destructive',
            warning: '!border-l-4 !border-l-warning',
            info: '!border-l-4 !border-l-accent',
          },
        }}
      />
    </div>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundPage,
})
