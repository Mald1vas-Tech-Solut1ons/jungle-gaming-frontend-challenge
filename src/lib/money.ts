import Decimal from 'decimal.js'

/** Aritmética ETH com precisão decimal. Nunca use `number` para valores monetários. */
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP })

export const ETH_DECIMALS = 18

export function eth(value: string | number | Decimal): Decimal {
  return new Decimal(value)
}

export function addEth(...values: string[]): string {
  return values.reduce((acc, v) => acc.plus(v), new Decimal(0)).toFixed()
}

export function mulEth(value: string, qty: number): string {
  return new Decimal(value).times(qty).toFixed()
}

export function compareEth(a: string, b: string): number {
  return new Decimal(a).comparedTo(b)
}

/** Formatação para exibição: até 4 casas, sem perder valores pequenos. */
export function formatEth(value: string, { withSymbol = true } = {}): string {
  const d = new Decimal(value)
  let digits = 4
  if (!d.isZero() && d.abs().lessThan('0.0001')) digits = 8
  const fixed = d.toDecimalPlaces(digits, Decimal.ROUND_HALF_UP).toFixed()
  const [int, frac] = fixed.split('.')
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const out = frac ? `${intFmt},${frac}` : intFmt
  return withSymbol ? `${out} ETH` : out
}

export function isValidEthString(value: string): boolean {
  return /^\d+(\.\d{1,18})?$/.test(value)
}

