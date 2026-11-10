import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Chain } from '@/api/contracts'
import { CHAIN_LABELS } from '@/lib/labels'

const CHAINS: Chain[] = ['ethereum', 'polygon', 'arbitrum']

interface NetworkSelectorProps {
  value: Chain
  disabled: boolean
  onChange: (network: Chain) => void
}

/** Seleção da rede — ao trocar, a página re-solicita a cotação. */
export function NetworkSelector({ value, disabled, onChange }: NetworkSelectorProps) {
  return (
    <div>
      <Label htmlFor="checkout-network">Rede</Label>
      <Select value={value} disabled={disabled} onValueChange={(v) => onChange(v as Chain)}>
        <SelectTrigger id="checkout-network" data-testid="checkout-network" className="mt-1.5">
          <SelectValue placeholder="Selecione a rede" />
        </SelectTrigger>
        <SelectContent>
          {CHAINS.map((chain) => (
            <SelectItem key={chain} value={chain}>
              {CHAIN_LABELS[chain]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="mt-1.5 text-xs text-muted-foreground">A taxa de rede varia conforme a blockchain selecionada.</p>
    </div>
  )
}
