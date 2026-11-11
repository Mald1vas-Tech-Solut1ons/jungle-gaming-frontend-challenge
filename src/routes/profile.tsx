import { createFileRoute, redirect } from '@tanstack/react-router'
import { AccountLayout } from '@/components/account/account-layout'
import { PasswordForm } from '@/components/account/password-form'
import { ProfileForm } from '@/components/account/profile-form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useMe } from '@/hooks/use-account'
import { getToken } from '@/lib/session'

export const Route = createFileRoute('/profile')({
  beforeLoad: ({ location }) => {
    if (!getToken()) {
      const search = { redirect: location.href }
      throw redirect({ to: '/login', search })
    }
  },
  component: function ProfilePage() {
    const { data: user, isLoading } = useMe()
    return (
      <AccountLayout title="Perfil">
        <h1 className="sr-only">Perfil do colecionador</h1>
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2" aria-label="Carregando perfil">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
            <Skeleton className="h-24 w-full md:col-span-2" />
          </div>
        ) : user ? (
          <ProfileForm user={user} />
        ) : (
          <Alert variant="destructive">
            <AlertTitle>Erro ao carregar</AlertTitle>
            <AlertDescription>Não foi possível carregar seus dados. Tente recarregar a página.</AlertDescription>
          </Alert>
        )}
        <div className="mt-12 border-t border-rule pt-8">
          <PasswordForm />
        </div>
      </AccountLayout>
    )
  },
})
