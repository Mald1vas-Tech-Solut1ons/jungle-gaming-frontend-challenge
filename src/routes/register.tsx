import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { AuthShell } from '@/components/account/auth-shell'
import { RegisterForm } from '@/components/account/register-form'
import { getToken } from '@/lib/session'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/register')({
  beforeLoad: () => {
    if (getToken()) throw redirect({ to: '/' })
  },
  validateSearch: searchSchema,
  component: function RegisterPage() {
    const { redirect: redirectTo } = Route.useSearch()
    return (
      <AuthShell mode="register" redirectTo={redirectTo} description="Crie seu perfil de colecionador para comprar, favoritar e acompanhar lançamentos.">
        <RegisterForm redirectTo={redirectTo} />
      </AuthShell>
    )
  },
})
