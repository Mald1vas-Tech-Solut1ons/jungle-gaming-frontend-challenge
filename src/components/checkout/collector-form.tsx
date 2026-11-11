import type { ReactNode } from 'react'
import type { Chain } from '@/api/contracts'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CHAIN_LABELS } from '@/lib/labels'

export interface CollectorFormValues {
  fullName: string
  username: string
  email: string
  note: string
}

const CHAINS = Object.keys(CHAIN_LABELS) as Chain[]
const NOTE_MAX = 280

interface CollectorFormProps {
  values: CollectorFormValues
  /** Erros por campo (client-side; mesmo formato de `normalizeError(err).fields`). */
  errors: Record<string, string>
  disabled: boolean
  network: Chain
  onNetworkChange: (network: Chain) => void
  onChange: (field: keyof CollectorFormValues, value: string) => void
}

function Required() {
  return (
    <span className="ml-0.5 text-destructive" aria-hidden="true">
      *
    </span>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="mt-1.5 animate-fade text-xs text-destructive" role="alert">
      {message}
    </p>
  )
}

function Field({ id, label, required, error, hint, children }: { id: string; label: string; required?: boolean; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <Label htmlFor={id} className="text-base">
        {label}
        {required && <Required />}
      </Label>
      <div className="mt-2.5">{children}</div>
      {hint && !error && <p className="mt-1.5 text-xs text-tan">{hint}</p>}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  )
}

/** "Perfil do colecionador" do pagamento: grade de 2 colunas, como no layout. */
export function CollectorForm({ values, errors, disabled, network, onNetworkChange, onChange }: CollectorFormProps) {
  const describedBy = (field: string) => (errors[field] ? `checkout-${field}-error` : undefined)
  return (
    <div className="grid gap-x-6 gap-y-6 md:grid-cols-2">
      <Field id="checkout-fullName" label="Nome de exibição" required error={errors.fullName}>
        <Input
          id="checkout-fullName"
          data-testid="checkout-fullName"
          autoComplete="name"
          placeholder="Como você quer aparecer no recibo"
          value={values.fullName}
          disabled={disabled}
          aria-required="true"
          aria-invalid={errors.fullName ? true : undefined}
          aria-describedby={describedBy('fullName')}
          onChange={(e) => onChange('fullName', e.target.value)}
        />
      </Field>

      <Field id="checkout-username" label="Nome de usuário" required error={errors.username}>
        <Input
          id="checkout-username"
          data-testid="checkout-username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="ex.: ana.nft"
          value={values.username}
          disabled={disabled}
          aria-required="true"
          aria-invalid={errors.username ? true : undefined}
          aria-describedby={describedBy('username')}
          onChange={(e) => onChange('username', e.target.value.toLowerCase())}
        />
      </Field>

      <Field id="checkout-email" label="E-mail" required error={errors.email}>
        <Input
          id="checkout-email"
          data-testid="checkout-email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          value={values.email}
          disabled={disabled}
          aria-required="true"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={describedBy('email')}
          onChange={(e) => onChange('email', e.target.value)}
        />
      </Field>

      <Field id="checkout-network" label="Rede" required hint="A taxa de rede é recalculada ao trocar a blockchain.">
        <Select value={network} disabled={disabled} onValueChange={(v) => onNetworkChange(v as Chain)}>
          <SelectTrigger id="checkout-network" data-testid="checkout-network">
            <SelectValue placeholder="Selecione uma rede" />
          </SelectTrigger>
          <SelectContent>
            {CHAINS.map((chain) => (
              <SelectItem key={chain} value={chain}>
                {CHAIN_LABELS[chain]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="md:col-span-2 md:max-w-[calc(50%-0.75rem)]">
        <Field id="checkout-note" label="Observação do colecionador (opcional)" error={errors.note}>
          <Textarea
            id="checkout-note"
            data-testid="checkout-note"
            rows={5}
            maxLength={NOTE_MAX}
            value={values.note}
            disabled={disabled}
            aria-invalid={errors.note ? true : undefined}
            aria-describedby={describedBy('note') ?? 'checkout-note-count'}
            onChange={(e) => onChange('note', e.target.value)}
            className="min-h-[150px] resize-none"
          />
        </Field>
        <p id="checkout-note-count" className="mt-1 text-right text-xs text-tan">
          {values.note.length}/{NOTE_MAX}
        </p>
      </div>
    </div>
  )
}
