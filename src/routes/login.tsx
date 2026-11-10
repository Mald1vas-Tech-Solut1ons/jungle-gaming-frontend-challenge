import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { DemoCredentials } from '@/components/account/demo-credentials'
import { LoginForm } from '@/components/account/login-form'
import { PageHeader } from '@/components/account/page-header'
import { getToken } from '@/lib/session'

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (getToken()) throw redirect({ to: '/' })
  },
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: function LoginPage() {
    const { redirect: redirectTo } = Route.useSearch()
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <PageHeader title="Entrar" description="Acesse sua conta de colecionador." />
        <LoginForm redirectTo={redirectTo} />
        <p className="text-center text-sm text-muted-foreground">
          Ainda não tem uma conta?{' '}
          <Link to="/register" data-testid="login-register-link" className="text-primary underline-offset-4 hover:underline">
            Criar conta
          </Link>
        </p>
        <DemoCredentials />
      </div>
    )
  },
})
