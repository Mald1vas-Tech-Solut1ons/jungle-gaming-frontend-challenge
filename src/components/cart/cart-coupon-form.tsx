import { useState } from 'react'
import { TicketPercent, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CartCouponFormProps {
  couponCode: string | null
  /** Desconto percentual vindo da cotação (exibido quando disponível). */
  percentOff: number | null
  applyPending: boolean
  removePending: boolean
  /** `pill`: campo arredondado do mobile; `bar`: campo + botão acoplado do desktop. */
  variant: 'bar' | 'pill'
  onApply: (code: string) => void
  onRemove: () => void
}

/** Código promocional (inválido/expirado → toast do hook de mutation). */
export function CartCouponForm({ couponCode, percentOff, applyPending, removePending, variant, onApply, onRemove }: CartCouponFormProps) {
  const [code, setCode] = useState('')

  if (couponCode) {
    return (
      <div className="flex animate-fade items-center justify-between gap-2 rounded-md border border-dashed border-success/60 bg-success/10 px-3 py-2">
        <span className="flex items-center gap-2 text-sm font-bold text-success">
          <TicketPercent className="size-4" aria-hidden="true" />
          {couponCode}
          {percentOff !== null ? ` · −${percentOff}%` : ''}
        </span>
        <Button type="button" variant="ghost" size="sm" data-testid="coupon-remove" isPending={removePending} onClick={onRemove} aria-label={`Remover cupom ${couponCode}`}>
          {!removePending && <X aria-hidden="true" />}
          Remover
        </Button>
      </div>
    )
  }

  return (
    <form
      className={cn('flex', variant === 'pill' ? 'h-12 rounded-full border border-rule bg-background/40 p-1' : 'h-10')}
      onSubmit={(e) => {
        e.preventDefault()
        if (code.trim()) onApply(code.trim().toUpperCase())
      }}
    >
      <label htmlFor="coupon-input" className="sr-only">
        Código promocional
      </label>
      <input
        id="coupon-input"
        data-testid="coupon-input"
        placeholder="Digite o código promocional..."
        autoComplete="off"
        autoCapitalize="characters"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className={cn(
          'min-w-0 flex-1 bg-transparent px-3 text-sm uppercase text-foreground outline-none placeholder:normal-case placeholder:text-tan',
          variant === 'bar' && 'rounded-l-sm border border-r-0 border-primary focus-visible:border-accent',
        )}
      />
      <Button
        type="submit"
        data-testid="coupon-apply"
        isPending={applyPending}
        disabled={!code.trim()}
        variant={variant === 'pill' ? 'pill' : 'default'}
        className={cn('h-full shrink-0 px-4 text-base', variant === 'bar' ? 'rounded-l-none' : 'rounded-full')}
      >
        Aplicar
      </Button>
    </form>
  )
}
