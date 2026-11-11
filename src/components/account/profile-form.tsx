import { useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
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

  const field = (id: string, label: string, control: ReactNode, error?: string, hint?: string) => (
    <div className="space-y-2.5">
      <Label htmlFor={id} className="text-base">
        {label}
        <span className="ml-0.5 text-destructive" aria-hidden="true">
          *
        </span>
      </Label>
      {control}
      <FieldError id={`${id}-error`}>{error}</FieldError>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-tan">
          {hint}
        </p>
      )}
    </div>
  )

  return (
    <section aria-labelledby="profile-title">
      <h2 id="profile-title" className="text-lg font-bold">
        Perfil do colecionador
      </h2>
      <form className="mt-6 grid gap-x-7 gap-y-6 md:grid-cols-2" onSubmit={handleSubmit} noValidate>
        {field(
          'profile-name',
          'Nome de exibição',
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
            aria-required="true"
            aria-invalid={fieldErrors.name ? true : undefined}
            aria-describedby={fieldErrors.name ? 'profile-name-error' : undefined}
          />,
          fieldErrors.name,
        )}
        {field(
          'profile-username',
          'Nome de usuário',
          <Input
            id="profile-username"
            data-testid="profile-username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(event) => {
              setUsername(event.target.value.toLowerCase())
              clearError('username')
            }}
            aria-required="true"
            aria-invalid={fieldErrors.username ? true : undefined}
            aria-describedby={fieldErrors.username ? 'profile-username-error' : 'profile-username-hint'}
          />,
          fieldErrors.username,
          '3–20 caracteres: letras minúsculas, números, ponto ou _.',
        )}
        {field(
          'profile-email',
          'E-mail',
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
            aria-required="true"
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? 'profile-email-error' : undefined}
          />,
          fieldErrors.email,
        )}

        <div className="space-y-2.5">
          <span className="block text-base" id="profile-avatar-label">
            Avatar
          </span>
          <div className="flex flex-wrap items-center gap-5">
            <Avatar className="size-12 border border-rule bg-tile">
              <AvatarImage src={avatarUrl ?? undefined} alt={`Avatar de ${name.trim() || 'você'}`} className="animate-fade object-cover" />
              <AvatarFallback className="bg-tile text-sm font-bold text-accent">{initials(name)}</AvatarFallback>
            </Avatar>
            <label className="inline-flex h-10 cursor-pointer items-center rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors duration-200 hover:bg-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background">
              Alterar
              <input
                id="profile-avatar-input"
                data-testid="profile-avatar-input"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleAvatarChange}
                aria-label="Alterar avatar"
                aria-invalid={fieldErrors.avatarUrl ? true : undefined}
                aria-describedby={fieldErrors.avatarUrl ? 'profile-avatar-error' : 'profile-avatar-hint'}
              />
            </label>
            <button
              type="button"
              className="cursor-pointer text-sm text-foreground transition-colors duration-200 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => {
                setAvatarUrl(null)
                clearError('avatarUrl')
              }}
              disabled={!avatarUrl}
            >
              Remover
            </button>
          </div>
          <FieldError id="profile-avatar-error">{fieldErrors.avatarUrl}</FieldError>
          <p id="profile-avatar-hint" className="text-xs text-tan">
            PNG, JPG, WebP ou GIF de até 1 MB.
          </p>
        </div>

        <div className="space-y-2.5 md:col-span-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="profile-bio" className="text-base">
              Bio
            </Label>
            <span className="text-xs text-tan" aria-hidden="true">
              {bio.length}/{MAX_BIO_CHARS}
            </span>
          </div>
          <Textarea
            id="profile-bio"
            data-testid="profile-bio"
            rows={3}
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

        <div className="md:col-span-2">
          <Button type="submit" className="h-10 min-w-[130px]" isPending={updateProfile.isPending} data-testid="profile-save">
            Salvar
          </Button>
        </div>
      </form>
    </section>
  )
}
