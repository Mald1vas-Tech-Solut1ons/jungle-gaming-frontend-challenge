import { useState, type CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import { Minus, Plus, Trash2 } from 'lucide-react'
import type { CartItem } from '@/api/contracts'
import { formatEth, mulEth } from '@/lib/money'
import { cn } from '@/lib/utils'

interface CartItemCardProps {
  item: CartItem
  index: number
  /** Mutação em andamento para este item (quantidade ou remoção). */
  pending: boolean
  /** `row`: linha da tabela desktop; `card`: cartão do mobile. */
  layout: 'row' | 'card'
  onChangeQuantity: (quantity: number) => void
  onRemove: () => void
}

/**
 * Item do carrinho: arte, nome, edição, preço unitário, stepper respeitando
 * `maxPerOrder`/`available` e total da linha. Erros da API (limite, estoque)
 * chegam via toast do hook de mutation.
 */
export function CartItemCard({ item, index, pending, layout, onChangeQuantity, onRemove }: CartItemCardProps) {
  const max = Math.min(item.available, item.maxPerOrder)
  const [draft, setDraft] = useState<string | null>(null)

  const commitDraft = () => {
    const parsed = draft === null ? Number.NaN : Number.parseInt(draft, 10)
    setDraft(null)
    if (Number.isNaN(parsed) || parsed < 1 || parsed > max || parsed === item.quantity) return
    onChangeQuantity(parsed)
  }

  const stepButton = cn(
    'flex cursor-pointer items-center justify-center transition-[background-color,transform,opacity] duration-200 active:scale-90 disabled:cursor-not-allowed disabled:opacity-35',
    layout === 'row' ? 'h-6 w-[18px] rounded-full bg-primary text-primary-foreground hover:bg-accent' : 'size-7 rounded-full border border-rule bg-tile text-foreground hover:bg-secondary',
  )

  const stepper = (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className={stepButton}
        aria-label={`Diminuir quantidade de ${item.nftName}`}
        data-testid="cart-qty-minus"
        disabled={pending || item.quantity <= 1}
        onClick={() => {
          setDraft(null)
          if (item.quantity > 1) onChangeQuantity(item.quantity - 1)
        }}
      >
        <Minus className="size-3.5" strokeWidth={3} aria-hidden="true" />
      </button>
      <input
        type="number"
        min={1}
        max={max}
        inputMode="numeric"
        aria-label={`Quantidade de ${item.nftName}`}
        data-testid="cart-qty-input"
        className="no-spin w-8 bg-transparent text-center text-lg text-foreground outline-none focus-visible:text-accent disabled:opacity-60"
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
      <button
        type="button"
        className={stepButton}
        aria-label={`Aumentar quantidade de ${item.nftName}`}
        data-testid="cart-qty-plus"
        disabled={pending || item.quantity >= max}
        onClick={() => {
          setDraft(null)
          if (item.quantity < max) onChangeQuantity(item.quantity + 1)
        }}
      >
        <Plus className="size-3.5" strokeWidth={3} aria-hidden="true" />
      </button>
    </div>
  )

  const removeButton = (
    <button
      type="button"
      className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-[color,transform] duration-200 hover:scale-110 hover:text-destructive disabled:opacity-40"
      aria-label={`Remover ${item.nftName} do carrinho`}
      data-testid="cart-remove"
      disabled={pending}
      onClick={onRemove}
    >
      <Trash2 className="size-5" aria-hidden="true" />
    </button>
  )

  const availability =
    item.available === 0 ? (
      <p className="text-xs font-bold text-destructive" role="status">
        Esgotado
      </p>
    ) : item.quantity > item.available ? (
      <p className="text-xs font-bold text-destructive" role="status">
        Apenas {item.available} disponível(is).
      </p>
    ) : null

  const title = (
    <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="block truncate text-base font-bold text-foreground transition-colors duration-200 hover:text-accent">
      {item.nftName}
    </Link>
  )

  const lineTotal = formatEth(mulEth(item.unitPrice, item.quantity))

  if (layout === 'card') {
    return (
      <li
        data-testid="cart-item"
        className={cn('stagger flex overflow-hidden rounded-xl bg-card transition-opacity duration-200', pending && 'opacity-60')}
        style={{ '--i': index } as CSSProperties}
      >
        <img src={item.image} alt="" width={200} height={200} className="w-[100px] shrink-0 rounded-xl object-cover" />
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {title}
              <p className="text-sm text-tan">Edição: {item.editionName}</p>
            </div>
            {removeButton}
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className="text-lg font-bold text-accent">{lineTotal}</p>
            {stepper}
          </div>
          {availability}
        </div>
      </li>
    )
  }

  return (
    <li
      data-testid="cart-item"
      className={cn(
        'stagger grid grid-cols-[minmax(0,1fr)_110px_110px_130px_40px] items-center gap-3 bg-card pr-4 transition-opacity duration-200',
        pending && 'opacity-60',
      )}
      style={{ '--i': index } as CSSProperties}
    >
      <div className="flex min-w-0 items-center gap-4">
        <img src={item.image} alt="" width={140} height={140} className="size-[70px] shrink-0 object-cover" />
        <div className="min-w-0">
          {title}
          <p className="truncate text-sm text-tan">Edição: {item.editionName}</p>
          {availability}
        </div>
      </div>
      <span className="text-base font-bold text-muted-foreground">{formatEth(item.unitPrice)}</span>
      {stepper}
      <span key={lineTotal} className="animate-fade text-base font-bold text-accent">
        {lineTotal}
      </span>
      {removeButton}
    </li>
  )
}
