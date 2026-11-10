import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLogin } from '@/hooks/use-session'
import { normalizeError } from '@/lib/api'
import { FieldError } from './field-error'
import { emailError, type FieldErrors } from './validators'

interface LoginFormProps {
  /** Caminho interno de retorno após o login (ex.: /checkout). */
  redirectTo?: string
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const navigate = useNavigate()
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  function clearError(field: string) {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: FieldErrors = {}
    const emailErr = emailError(email)
    if (emailErr) errors.email = emailErr
    if (!password) errors.password = 'Informe sua senha.'
    setFieldErrors(errors)
    setFormError(null)
    if (Object.keys(errors).length > 0) return
    login.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => {
          // Valida para evitar open redirect: só navega em caminho interno.
          const target = redirectTo?.startsWith('/') ? redirectTo : '/'
          void navigate({ to: target })
        },
        onError: (error) => {
          const apiError = normalizeError(error)
          if (apiError.status === 401) setFormError('E-mail ou senha incorretos.')
          else if (apiError.fields) setFieldErrors(apiError.fields)
          else setFormError(apiError.message)
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar na conta</CardTitle>
        <CardDescription>Acesse o marketplace com seu e-mail e senha.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {formError ? (
            <Alert variant="destructive">
              <AlertTitle>Não foi possível entrar</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="login-email">E-mail</Label>
            <Input
              id="login-email"
              data-testid="login-email"
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                clearError('email')
              }}
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
            />
            <FieldError id="login-email-error">{fieldErrors.email}</FieldError>
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Senha</Label>
            <Input
              id="login-password"
              data-testid="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                clearError('password')
              }}
              aria-invalid={fieldErrors.password ? true : undefined}
              aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
            />
            <FieldError id="login-password-error">{fieldErrors.password}</FieldError>
          </div>
          <Button type="submit" className="w-full" isPending={login.isPending} data-testid="login-submit">
            Entrar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
