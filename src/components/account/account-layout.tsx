import type { ComponentType, ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { CircleAlert, Download, Heart, LogOut, MapPin, ShoppingCart, TrendingUp, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { MobileTopBar } from '@/components/layout/mobile-top-bar'
import { useIsMobile } from '@/hooks/use-media-query'
import { useLogout } from '@/hooks/use-session'
import { cn } from '@/lib/utils'

type NavItem = { label: string; icon: ComponentType<{ className?: string }>; to?: '/profile' | '/wallets' }

const NAV: NavItem[] = [
  { label: 'Dados do perfil', icon: UserRound, to: '/profile' },
  { label: 'Carteiras', icon: MapPin, to: '/wallets' },
  { label: 'Atividade', icon: ShoppingCart },
  { label: 'Lista de interesse', icon: Heart },
  { label: 'Ofertas', icon: TrendingUp },
  { label: 'Arquivos baixados', icon: Download },
  { label: 'Suporte', icon: CircleAlert },
]

const itemClass =
  'relative flex h-[45px] w-full cursor-pointer items-center gap-3 pl-4 pr-3 text-base text-primary transition-[background-color,color,padding] duration-200 hover:bg-tile hover:pl-5 hover:text-accent'

/**
 * Área do colecionador (frames "Perfil do Colecionador" e "Carteiras"):
 * sidebar "Meu perfil" com item ativo marcado por barra âmbar. No mobile (sem
 * frame no Figma) a sidebar vira abas horizontais sob a barra de topo.
 */
export function AccountLayout({ title, children }: { title: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isMobile = useIsMobile()
  const logout = useLogout()

  if (isMobile) {
    return (
      <div>
        <MobileTopBar title={title} />
        <nav aria-label="Área do colecionador" className="mb-6 grid grid-cols-2 rounded-full bg-card p-1">
          {NAV.filter((item) => item.to).map((item) => {
            const active = pathname === item.to
            return (
              <Link
                key={item.label}
                to={item.to!}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-10 items-center justify-center rounded-full text-sm font-bold transition-colors duration-200',
                  active ? 'cta-gradient text-primary-foreground' : 'text-muted-foreground',
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        {children}
        <button
          type="button"
          onClick={() => logout.mutate()}
          className="mt-10 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-rule py-3 font-bold text-accent"
        >
          <LogOut className="size-5" aria-hidden="true" />
          Sair da conta
        </button>
      </div>
    )
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[310px_minmax(0,1fr)] lg:gap-7">
      <nav aria-label="Área do colecionador" className="animate-rise bg-card lg:sticky lg:top-24">
        <h2 className="px-2.5 pb-2 pt-6 text-xl font-bold">Meu perfil</h2>
        <ul>
          {NAV.map(({ label, icon: Icon, to }) => {
            const active = to !== undefined && pathname === to
            const content = (
              <>
                <span
                  aria-hidden="true"
                  className={cn('absolute inset-y-0 left-0 w-1.5 bg-primary transition-transform duration-300 ease-out-soft', active ? 'scale-y-100' : 'scale-y-0')}
                />
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                {label}
              </>
            )
            return (
              <li key={label}>
                {to ? (
                  <Link to={to} aria-current={active ? 'page' : undefined} className={cn(itemClass, active && 'font-bold text-accent')}>
                    {content}
                  </Link>
                ) : (
                  <button type="button" className={itemClass} onClick={() => toast.info(`“${label}” fica fora do escopo desta entrega.`)}>
                    {content}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        <div className="border-t border-rule">
          <button type="button" className={cn(itemClass, 'font-bold')} onClick={() => logout.mutate()} disabled={logout.isPending}>
            <LogOut className="size-[18px]" aria-hidden="true" />
            Sair
          </button>
        </div>
      </nav>
      <div className="min-w-0 animate-rise [animation-delay:80ms]">{children}</div>
    </div>
  )
}
