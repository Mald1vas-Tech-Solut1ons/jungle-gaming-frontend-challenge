import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CartCouponFormProps {
  couponCode: string | null
  /** Desconto percentual vindo da cotação (exibido quando disponível). */
  percentOff: number | null
  applyPending: boolean
  removePending: boolean
  onApply: (code: string) => void
  onRemove: () => void
}

/** Aplicação/remoção de cupom no carrinho. Erros (inválido/expirado) via toast do hook. */
export function CartCouponForm({ couponCode, percentOff, applyPending, removePending, onApply, onRemove }: CartCouponFormProps) {
  const [code, setCode] = useState('')

  return (
    <div>
      <Label htmlFor="coupon-input" className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
        Cupom
      </Label>
      {couponCode ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2">
          <Badge variant="secondary">
            {couponCode}
            {percentOff !== null ? ` · −${percentOff}%` : ''}
          </Badge>
          <Button type="button" variant="ghost" size="sm" data-testid="coupon-remove" isPending={removePending} onClick={onRemove}>
            Remover
          </Button>
        </div>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (code.trim()) onApply(code.trim())
          }}
        >
          <Input
            id="coupon-input"
            data-testid="coupon-input"
            placeholder="Ex.: JUNGLE10"
            value={code}
            className="uppercase placeholder:normal-case"
            onChange={(e) => setCode(e.target.value)}
          />
          <Button type="submit" variant="outline" data-testid="coupon-apply" isPending={applyPending} disabled={!code.trim()}>
            Aplicar
          </Button>
        </form>
      )}
    </div>
  )
}
