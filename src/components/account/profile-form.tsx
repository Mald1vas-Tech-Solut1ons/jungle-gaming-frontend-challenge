import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateProfile } from '@/hooks/use-account'
import { normalizeError } from '@/lib/api'
import type { User } from '@/api/contracts'
import { FieldError } from './field-error'
import { emailError, nameError, usernameError, MAX_AVATAR_BYTES, MAX_BIO_CHARS, type FieldErrors } from './validators'

interface ProfileFormProps {
  user: User
}

/** Iniciais do nome para o fallback do avatar. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0] ?? ''
  const second = parts[1] ?? ''
  if (!first) return '?'
  const base = second ? first.charAt(0) + second.charAt(0) : first.slice(0, 2)
  return base.toUpperCase()
}

/** Formulário de dados públicos do colecionador (nome, username, e-mail, bio e avatar). */
export function ProfileForm({ user }: ProfileFormProps) {
  const updateProfile = useUpdateProfile()
  const [name, setName] = useState(user.name)
  const [username, setUsername] = useState(user.username)
  const [email, setEmail] = useState(user.email)
  const [bio, setBio] = useState(user.bio)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  function clearError(field: string) {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Permite selecionar o mesmo arquivo novamente.
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFieldErrors((prev) => ({ ...prev, avatarUrl: 'Envie um arquivo de imagem (PNG, JPG, WebP ou GIF).' }))
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setFieldErrors((prev) => ({ ...prev, avatarUrl: 'A imagem deve ter no máximo 1 MB.' }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result)
        clearError('avatarUrl')
      } else {
        setFieldErrors((prev) => ({ ...prev, avatarUrl: 'Não foi possível ler o arquivo.' }))
      }
    }
    reader.onerror = () => {
      setFieldErrors((prev) => ({ ...prev, avatarUrl: 'Não foi possível ler o arquivo.' }))
    }
    reader.readAsDataURL(file)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: FieldErrors = {}
    const nameErr = nameError(name)
    if (nameErr) errors.name = nameErr
    const usernameErr = usernameError(username)
    if (usernameErr) errors.username = usernameErr
    const emailErr = emailError(email)
    if (emailErr) errors.email = emailErr
    if (bio.length > MAX_BIO_CHARS) errors.bio = `A bio deve ter no máximo ${MAX_BIO_CHARS} caracteres.`
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    updateProfile.mutate(
      { name: name.trim(), username, email: email.trim(), bio, avatarUrl },
      {
        onError: (error) => {
          const apiError = normalizeError(error)
          if (apiError.fields) setFieldErrors(apiError.fields)
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados da conta</CardTitle>
        <CardDescription>Informações públicas exibidas no marketplace.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="profile-avatar-input">Avatar</Label>
            <div className="flex flex-wrap items-center gap-4">
              <Avatar className="size-16">
                <AvatarImage src={avatarUrl ?? undefined} alt={`Avatar de ${name.trim() || 'você'}`} />
                <AvatarFallback>{initials(name)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                <Input
                  id="profile-avatar-input"
                  data-testid="profile-avatar-input"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  aria-invalid={fieldErrors.avatarUrl ? true : undefined}
                  aria-describedby={fieldErrors.avatarUrl ? 'profile-avatar-error' : undefined}
                  className="max-w-60"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => {
                    setAvatarUrl(null)
                    clearError('avatarUrl')
                  }}
                  disabled={!avatarUrl}
                >
                  Remover avatar
                </Button>
              </div>
            </div>
            <FieldError id="profile-avatar-error">{fieldErrors.avatarUrl}</FieldError>
            <p className="text-xs text-muted-foreground">PNG, JPG, WebP ou GIF de até 1 MB.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-name">Nome</Label>
            <Input
              id="profile-name"
              data-testid="profile-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                clearError('name')
              }}
              aria-invalid={fieldErrors.name ? true : undefined}
              aria-describedby={fieldErrors.name ? 'profile-name-error' : undefined}
            />
            <FieldError id="profile-name-error">{fieldErrors.name}</FieldError>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-username">Nome de usuário</Label>
            <Input
              id="profile-username"
              data-testid="profile-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value.toLowerCase())
                clearError('username')
              }}
              aria-invalid={fieldErrors.username ? true : undefined}
              aria-describedby={fieldErrors.username ? 'profile-username-error' : undefined}
            />
            <FieldError id="profile-username-error">{fieldErrors.username}</FieldError>
            <p className="text-xs text-muted-foreground">3–20 caracteres: letras minúsculas, números, ponto ou _.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">E-mail</Label>
            <Input
              id="profile-email"
              data-testid="profile-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                clearError('email')
              }}
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={fieldErrors.email ? 'profile-email-error' : undefined}
            />
            <FieldError id="profile-email-error">{fieldErrors.email}</FieldError>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="profile-bio">Bio</Label>
              <span className="text-xs text-muted-foreground" aria-hidden="true">
                {bio.length}/{MAX_BIO_CHARS}
              </span>
            </div>
            <Textarea
              id="profile-bio"
              data-testid="profile-bio"
              rows={4}
              maxLength={MAX_BIO_CHARS}
              placeholder="Conte um pouco sobre você e sua coleção…"
              value={bio}
              onChange={(event) => {
                setBio(event.target.value)
                clearError('bio')
              }}
              aria-invalid={fieldErrors.bio ? true : undefined}
              aria-describedby={fieldErrors.bio ? 'profile-bio-error' : undefined}
            />
            <FieldError id="profile-bio-error">{fieldErrors.bio}</FieldError>
          </div>
          <Button type="submit" isPending={updateProfile.isPending} data-testid="profile-save">
            Salvar alterações
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
