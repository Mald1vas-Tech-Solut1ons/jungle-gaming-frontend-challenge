import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { PageHeader } from '@/components/account/page-header'
import { RegisterForm } from '@/components/account/register-form'
import { getToken } from '@/lib/session'

export const Route = createFileRoute('/register')({
  beforeLoad: () => {
    if (getToken()) throw redirect({ to: '/' })
  },
  component: function RegisterPage() {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <PageHeader title="Criar conta" description="Comece sua coleção no Jungle." />
        <RegisterForm />
        <p className="text-center text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    )
  },
})
