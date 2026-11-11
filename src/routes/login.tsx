import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthShell } from '@/components/account/auth-shell'
import { LoginForm } from '@/components/account/login-form'
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
      <AuthShell mode="login" redirectTo={redirectTo} description="Entre para gerenciar sua carteira, coleção e perfil de criador.">
        <LoginForm redirectTo={redirectTo} />
      </AuthShell>
    )
  },
})
