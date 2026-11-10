import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { COUNTRIES } from '@/lib/labels'

export interface CollectorFormValues {
  fullName: string
  email: string
  country: string
  document: string
}

interface CollectorFormProps {
  values: CollectorFormValues
  /** Erros por campo (client-side; mesmo formato de `normalizeError(err).fields`). */
  errors: Record<string, string>
  disabled: boolean
  onChange: (field: keyof CollectorFormValues, value: string) => void
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="mt-1.5 text-xs text-destructive" role="alert">
      {message}
    </p>
  )
}

/** Dados do colecionador para o pedido (documento é opcional). */
export function CollectorForm({ values, errors, disabled, onChange }: CollectorFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="checkout-fullName">Nome completo</Label>
        <Input
          id="checkout-fullName"
          data-testid="checkout-fullName"
          autoComplete="name"
          placeholder="Seu nome completo"
          value={values.fullName}
          disabled={disabled}
          aria-invalid={errors.fullName ? true : undefined}
          aria-describedby={errors.fullName ? 'checkout-fullName-error' : undefined}
          className="mt-1.5"
          onChange={(e) => onChange('fullName', e.target.value)}
        />
        <FieldError id="checkout-fullName-error" message={errors.fullName} />
      </div>

      <div>
        <Label htmlFor="checkout-email">E-mail</Label>
        <Input
          id="checkout-email"
          data-testid="checkout-email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          value={values.email}
          disabled={disabled}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? 'checkout-email-error' : undefined}
          className="mt-1.5"
          onChange={(e) => onChange('email', e.target.value)}
        />
        <FieldError id="checkout-email-error" message={errors.email} />
      </div>

      <div>
        <Label htmlFor="checkout-country">País</Label>
        <Select value={values.country === '' ? undefined : values.country} disabled={disabled} onValueChange={(v) => onChange('country', v)}>
          <SelectTrigger
            id="checkout-country"
            data-testid="checkout-country"
            className="mt-1.5"
            aria-invalid={errors.country ? true : undefined}
            aria-describedby={errors.country ? 'checkout-country-error' : undefined}
          >
            <SelectValue placeholder="Selecione o país" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((country) => (
              <SelectItem key={country} value={country}>
                {country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError id="checkout-country-error" message={errors.country} />
      </div>

      <div>
        <Label htmlFor="checkout-document">Documento (opcional)</Label>
        <Input
          id="checkout-document"
          data-testid="checkout-document"
          placeholder="CPF, RG ou passaporte"
          value={values.document}
          disabled={disabled}
          className="mt-1.5"
          onChange={(e) => onChange('document', e.target.value)}
        />
      </div>
    </div>
  )
}
