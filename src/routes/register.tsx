import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { PageHeader } from '@/components/account/page-header'
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
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <PageHeader title="Criar conta" description="Comece sua coleção na Kurio." />
        <RegisterForm redirectTo={redirectTo} />
        <p className="text-center text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <Link to="/login" search={redirectTo ? { redirect: redirectTo } : undefined} className="text-primary underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    )
  },
})
