import { createFileRoute, redirect } from '@tanstack/react-router'
import { PageHeader } from '@/components/account/page-header'
import { PasswordForm } from '@/components/account/password-form'
import { ProfileForm } from '@/components/account/profile-form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
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
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <PageHeader title="Perfil do colecionador" description="Atualize seus dados públicos e a senha da conta." />
        {isLoading ? (
          <Card>
            <CardContent className="space-y-4 p-5">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-28" />
            </CardContent>
          </Card>
        ) : user ? (
          <ProfileForm user={user} />
        ) : (
          <Alert variant="destructive">
            <AlertTitle>Erro ao carregar</AlertTitle>
            <AlertDescription>Não foi possível carregar seus dados. Tente recarregar a página.</AlertDescription>
          </Alert>
        )}
        <PasswordForm />
      </div>
    )
  },
})
