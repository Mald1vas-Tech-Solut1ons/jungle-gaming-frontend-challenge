import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useChangePassword } from '@/hooks/use-account'
import { normalizeError } from '@/lib/api'
import { PasswordInput } from './auth-shell'
import { FieldError } from './field-error'
import { passwordError, type FieldErrors } from './validators'

/** Formulário de troca de senha (senha atual + nova senha + confirmação). */
export function PasswordForm() {
  const changePassword = useChangePassword()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

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
    if (!currentPassword) errors.currentPassword = 'Informe sua senha atual.'
    const newErr = passwordError(newPassword)
    if (newErr) errors.newPassword = newErr
    if (confirm !== newPassword) errors.confirm = 'As senhas não coincidem.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword('')
          setNewPassword('')
          setConfirm('')
          setFieldErrors({})
        },
        onError: (error) => {
          const apiError = normalizeError(error)
          if (apiError.fields) setFieldErrors(apiError.fields)
        },
      },
    )
  }

  return (
    <section aria-labelledby="password-title" className="max-w-[417px]">
      <h2 id="password-title" className="text-lg font-bold">
        Alterar senha
      </h2>
      <form className="mt-5 space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2.5">
            <Label htmlFor="password-current">Senha atual</Label>
            <PasswordInput
              id="password-current"
              data-testid="password-current"
              autoComplete="current-password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value)
                clearError('currentPassword')
              }}
              aria-invalid={fieldErrors.currentPassword ? true : undefined}
              aria-describedby={fieldErrors.currentPassword ? 'password-current-error' : undefined}
            />
            <FieldError id="password-current-error">{fieldErrors.currentPassword}</FieldError>
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="password-new">Nova senha</Label>
            <PasswordInput
              id="password-new"
              data-testid="password-new"
              autoComplete="new-password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value)
                clearError('newPassword')
              }}
              aria-invalid={fieldErrors.newPassword ? true : undefined}
              aria-describedby={fieldErrors.newPassword ? 'password-new-error' : undefined}
            />
            <FieldError id="password-new-error">{fieldErrors.newPassword}</FieldError>
            <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres, com ao menos um número e uma letra.</p>
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="password-confirm">Confirmar nova senha</Label>
            <PasswordInput
              id="password-confirm"
              data-testid="password-confirm"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={(event) => {
                setConfirm(event.target.value)
                clearError('confirm')
              }}
              aria-invalid={fieldErrors.confirm ? true : undefined}
              aria-describedby={fieldErrors.confirm ? 'password-confirm-error' : undefined}
            />
            <FieldError id="password-confirm-error">{fieldErrors.confirm}</FieldError>
          </div>
          <Button type="submit" className="h-10 min-w-[130px]" isPending={changePassword.isPending} data-testid="password-save">
            Alterar senha
          </Button>
      </form>
    </section>
  )
}
