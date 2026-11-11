import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronDown, Eye, EyeOff, X } from 'lucide-react'
import { toast } from 'sonner'
import { FacebookIcon, GoogleIcon } from '@/components/layout/brand-icons'
import { Input } from '@/components/ui/input'
import { useIsMobile } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'

interface AuthShellProps {
  mode: 'login' | 'register'
  redirectTo?: string
  description: string
  children: ReactNode
}

function SocialButtons() {
  const notAvailable = (provider: string) =>
    toast.info(`Login com ${provider} não está disponível na simulação. Use e-mail e senha (contas de demonstração abaixo).`)
  const button =
    'flex h-11 w-full cursor-pointer items-center justify-center gap-3 rounded-sm border border-rule bg-card text-sm text-muted-foreground transition-[border-color,color,transform] duration-200 hover:border-primary hover:text-foreground active:scale-[0.98]'
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-sm text-foreground" role="separator" aria-label="Ou continue com">
        <span className="h-px flex-1 bg-rule" aria-hidden="true" />
        <span aria-hidden="true">Ou continue com</span>
        <span className="h-px flex-1 bg-rule" aria-hidden="true" />
      </div>
      <button type="button" className={button} onClick={() => notAvailable('Google')}>
        <GoogleIcon className="size-5" />
        Continuar com Google
      </button>
      <button type="button" className={button} onClick={() => notAvailable('Facebook')}>
        <FacebookIcon className="size-5 text-[#1877F2]" />
        Continuar com Facebook
      </button>
    </div>
  )
}

/** Contas fictícias do README, discretas e recolhíveis dentro do painel. */
function DemoAccounts() {
  return (
    <details data-testid="demo-credentials" className="group rounded-sm border border-dashed border-rule px-3 py-2 text-xs text-tan">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-bold text-muted-foreground">
        Contas de demonstração
        <ChevronDown className="size-4 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
      </summary>
      <ul className="mt-2 space-y-1">
        <li>ana@jungle.test · Senha@123</li>
        <li>bruno@jungle.test · Senha@123</li>
      </ul>
    </details>
  )
}

/**
 * Moldura das telas de autenticação. Desktop: painel do layout sobreposto ao
 * hero (abas "Entrar | Criar conta", faixa âmbar na base). Mobile: tela
 * empilhada com a marca no topo.
 */
export function AuthShell({ mode, redirectTo, description, children }: AuthShellProps) {
  const isMobile = useIsMobile()
  const search = redirectTo ? { redirect: redirectTo } : undefined
  const tab = (target: 'login' | 'register', label: string) => {
    const active = mode === target
    return (
      <Link
        to={target === 'login' ? '/login' : '/register'}
        search={search}
        aria-current={active ? 'page' : undefined}
        className={cn('transition-colors duration-200', active ? 'text-accent' : 'text-foreground hover:text-accent')}
      >
        {label}
      </Link>
    )
  }

  if (isMobile) {
    return (
      <div className="mx-auto flex min-h-[calc(100svh-2rem)] max-w-sm flex-col pb-8 pt-16">
        <Link to="/" className="logo-kurio self-center text-[32px] text-foreground" aria-label="Kurio — página inicial">
          Kurio
        </Link>
        <h1 className="mt-20 animate-rise text-center text-xl font-bold">{mode === 'login' ? 'Entrar' : 'Criar perfil de colecionador'}</h1>
        <p className="sr-only">{description}</p>
        <div className="mt-8 animate-rise [animation-delay:80ms]">{children}</div>
        <div className="mt-8">
          <SocialButtons />
        </div>
        <p className="mt-8 text-center text-base text-muted-foreground">
          {mode === 'login' ? 'Novo na Kurio? ' : 'Já tem uma conta? '}
          <Link
            to={mode === 'login' ? '/register' : '/login'}
            search={search}
            data-testid={mode === 'login' ? 'login-register-link' : undefined}
            className="font-bold text-accent underline-offset-4 hover:underline"
          >
            {mode === 'login' ? 'Crie uma conta' : 'Entre'}
          </Link>
        </p>
        <div className="mt-6">
          <DemoAccounts />
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[640px] pb-10">
      {/* Fundo decorativo: hero da home (como no frame, o painel sobrepõe o hero) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden select-none lg:block">
        <div className="absolute left-10 top-16 max-w-[34rem] opacity-60">
          <p className="text-sm tracking-[0.08em]">Bem-vindo à Kurio</p>
          <p className="display-title mt-2 text-[42px] leading-[1.65]">
            Seja dono do futuro
            <br />
            da arte digital
          </p>
        </div>
        <img src="/nfts/ape-01.webp" alt="" width={450} height={450} className="absolute right-0 top-0 size-[450px] rounded-2xl object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-background/70 to-background/30" />
      </div>

      <section
        aria-labelledby="auth-title"
        className="relative mx-auto mt-6 w-full max-w-[500px] animate-rise border-b-[10px] border-primary bg-card shadow-[0_40px_90px_-30px_rgb(0_0_0_/_0.95)] lg:mt-16"
      >
        <Link
          to="/"
          aria-label="Fechar e voltar ao início"
          className="absolute right-5 top-5 rounded-sm text-accent transition-transform duration-200 hover:rotate-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-5" aria-hidden="true" />
        </Link>
        <div className="px-8 pb-8 pt-12 sm:px-20">
          <h1 id="auth-title" className="flex items-center justify-center gap-3 text-xl font-bold">
            <span className="sr-only">{mode === 'login' ? 'Entrar' : 'Criar conta'}</span>
            <span aria-hidden="true" className="contents">
              {tab('login', 'Entrar')}
              <span className="h-6 w-px bg-primary" />
              {tab('register', 'Criar conta')}
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xs text-center text-sm leading-[1.6]">{description}</p>
          <div className="mt-6">{children}</div>
          <div className="mt-6">
            <SocialButtons />
          </div>
          <div className="mt-6">
            <DemoAccounts />
          </div>
        </div>
      </section>
    </div>
  )
}

/** Campo de senha com alternância de visibilidade (ícone de olho do layout). */
export function PasswordInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={cn('pr-11', className)} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
        className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm text-tan transition-colors duration-200 hover:text-accent"
      >
        {visible ? <Eye className="size-[18px]" aria-hidden="true" /> : <EyeOff className="size-[18px]" aria-hidden="true" />}
      </button>
    </div>
  )
}
