import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

/** Credenciais fictícias da API mock, exibidas como dica na tela de login. */
export function DemoCredentials() {
  return (
    <Alert variant="info" data-testid="demo-credentials">
      <AlertTitle>Contas de demonstração</AlertTitle>
      <AlertDescription>
        <p>ana@jungle.test · Senha@123</p>
        <p>bruno@jungle.test · Senha@123</p>
      </AlertDescription>
    </Alert>
  )
}
