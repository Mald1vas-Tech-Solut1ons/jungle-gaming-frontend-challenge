import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRegister } from '@/hooks/use-session'
import { normalizeError } from '@/lib/api'
import { PasswordInput } from './auth-shell'
import { FieldError } from './field-error'
import { emailError, nameError, passwordError, type FieldErrors } from './validators'

export function RegisterForm({ redirectTo }: { redirectTo?: string }) {
  const navigate = useNavigate()
  const register = useRegister()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
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
    const nameErr = nameError(name)
    if (nameErr) errors.name = nameErr
    const emailErr = emailError(email)
    if (emailErr) errors.email = emailErr
    const passwordErr = passwordError(password)
    if (passwordErr) errors.password = passwordErr
    if (confirm !== password) errors.confirm = 'As senhas não coincidem.'
    setFieldErrors(errors)
    setFormError(null)
    if (Object.keys(errors).length > 0) return
    register.mutate(
      { name: name.trim(), email: email.trim(), password },
      {
        onSuccess: () => {
          let target = '/'
          const raw = redirectTo ?? ''
          if (raw.startsWith('/')) target = raw
          else {
            try {
              target = new URL(raw).pathname + new URL(raw).search || '/'
            } catch {
              target = '/'
            }
          }
          void navigate({ to: target })
        },
        onError: (error) => {
          const apiError = normalizeError(error)
          if (apiError.code === 'CONFLICT') {
            // E-mail já cadastrado — destaque no campo de e-mail.
            setFieldErrors(apiError.fields ?? { email: apiError.message })
          } else if (apiError.fields) {
            setFieldErrors(apiError.fields)
          } else {
            setFormError(apiError.message)
          }
        },
      },
    )
  }

  return (
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {formError ? (
            <Alert variant="destructive">
              <AlertTitle>Não foi possível criar a conta</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground" htmlFor="register-name">Nome</Label>
            <Input
              id="register-name"
              data-testid="register-name"
              type="text"
              autoComplete="name"
              placeholder="Nome de colecionador"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                clearError('name')
              }}
              aria-invalid={fieldErrors.name ? true : undefined}
              aria-describedby={fieldErrors.name ? 'register-name-error' : undefined}
            />
            <FieldError id="register-name-error">{fieldErrors.name}</FieldError>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground" htmlFor="register-email">E-mail</Label>
            <Input
              id="register-email"
              data-testid="register-email"
              type="email"
              autoComplete="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                clearError('email')
              }}
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
            />
            <FieldError id="register-email-error">{fieldErrors.email}</FieldError>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground" htmlFor="register-password">Senha</Label>
            <PasswordInput
              id="register-password"
              data-testid="register-password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                clearError('password')
              }}
              aria-invalid={fieldErrors.password ? true : undefined}
              aria-describedby={fieldErrors.password ? 'register-password-error' : undefined}
            />
            <FieldError id="register-password-error">{fieldErrors.password}</FieldError>
            <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres, com ao menos um número e uma letra.</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground" htmlFor="register-confirm">Confirmar senha</Label>
            <PasswordInput
              id="register-confirm"
              data-testid="register-confirm"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={(event) => {
                setConfirm(event.target.value)
                clearError('confirm')
              }}
              aria-invalid={fieldErrors.confirm ? true : undefined}
              aria-describedby={fieldErrors.confirm ? 'register-confirm-error' : undefined}
            />
            <FieldError id="register-confirm-error">{fieldErrors.confirm}</FieldError>
          </div>
          <Button type="submit" className="h-12 w-full text-base max-md:h-[60px] max-md:rounded-lg" isPending={register.isPending} data-testid="register-submit">
            Criar conta
          </Button>
        </form>
  )
}
