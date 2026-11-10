import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CartItem } from '@/api/contracts'
import { formatEth } from '@/lib/money'

interface CartItemCardProps {
  item: CartItem
  /** Mutação em andamento para este item (quantidade ou remoção). */
  pending: boolean
  onChangeQuantity: (quantity: number) => void
  onRemove: () => void
}

/**
 * Linha do carrinho: imagem, nome, edição, preço unitário e stepper de
 * quantidade respeitando `maxPerOrder` e `available`. O erro da API (ex.:
 * limite excedido) aparece via toast do hook de mutation.
 */
export function CartItemCard({ item, pending, onChangeQuantity, onRemove }: CartItemCardProps) {
  const max = Math.min(item.available, item.maxPerOrder)
  const [draft, setDraft] = useState<string | null>(null)

  const commitDraft = () => {
    const parsed = draft === null ? Number.NaN : Number.parseInt(draft, 10)
    setDraft(null)
    if (Number.isNaN(parsed) || parsed < 1 || parsed > max || parsed === item.quantity) return
    onChangeQuantity(parsed)
  }

  const decrease = () => {
    setDraft(null)
    if (item.quantity > 1) onChangeQuantity(item.quantity - 1)
  }

  const increase = () => {
    setDraft(null)
    if (item.quantity < max) onChangeQuantity(item.quantity + 1)
  }

  return (
    <li data-testid="cart-item" className="flex gap-3 rounded-lg border border-border bg-card p-3 sm:gap-4 sm:p-4">
      <img src={item.image} alt={item.nftName} className="size-20 shrink-0 rounded-md border border-border object-cover" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to="/nft/$nftId"
              params={{ nftId: item.nftId }}
              className="block truncate text-sm font-semibold text-foreground hover:text-primary"
            >
              {item.nftName}
            </Link>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.editionName}</p>
          </div>
          <span className="whitespace-nowrap text-sm text-foreground">{formatEth(item.unitPrice)}</span>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              aria-label={`Diminuir quantidade de ${item.nftName}`}
              data-testid="cart-qty-minus"
              disabled={pending || item.quantity <= 1}
              onClick={decrease}
            >
              <Minus aria-hidden="true" />
            </Button>
            <Input
              type="number"
              min={1}
              max={max}
              inputMode="numeric"
              aria-label={`Quantidade de ${item.nftName}`}
              data-testid="cart-qty-input"
              className="h-8 w-14 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              value={draft ?? String(item.quantity)}
              disabled={pending}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitDraft()
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              aria-label={`Aumentar quantidade de ${item.nftName}`}
              data-testid="cart-qty-plus"
              disabled={pending || item.quantity >= max}
              onClick={increase}
            >
              <Plus aria-hidden="true" />
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Remover ${item.nftName} do carrinho`}
            data-testid="cart-remove"
            disabled={pending}
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" />
            Remover
          </Button>
        </div>

        {item.available === 0 ? (
          <p className="text-xs text-destructive">Esgotado</p>
        ) : item.quantity > item.available ? (
          <p className="text-xs text-destructive">Apenas {item.available} disponível(is).</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Disponível: {item.available} · máx. {item.maxPerOrder} por pedido
          </p>
        )}
      </div>
    </li>
  )
}
