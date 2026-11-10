/**
 * Regras de validação compartilhadas pelas páginas de conta.
 * As mensagens espelham as regras da API mock (src/mocks/handlers/account.ts).
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const USERNAME_RE = /^[a-z0-9._]{3,20}$/
export const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/

export const MAX_BIO_CHARS = 280
export const MAX_AVATAR_BYTES = 1024 * 1024

export type FieldErrors = Record<string, string>

export function nameError(name: string): string | undefined {
  if (name.trim().length < 2) return 'Informe seu nome (mín. 2 caracteres).'
  return undefined
}

export function emailError(email: string): string | undefined {
  if (!email.trim()) return 'Informe seu e-mail.'
  if (!EMAIL_RE.test(email.trim())) return 'Informe um e-mail válido.'
  return undefined
}

export function passwordError(password: string): string | undefined {
  if (!password) return 'Informe sua senha.'
  if (password.length < 8) return 'A senha deve ter pelo menos 8 caracteres.'
  if (!/\d/.test(password)) return 'A senha deve conter ao menos um número.'
  if (!/[A-Za-z]/.test(password)) return 'A senha deve conter ao menos uma letra.'
  return undefined
}

export function usernameError(username: string): string | undefined {
  if (!USERNAME_RE.test(username)) return 'Use 3–20 caracteres: letras minúsculas, números, ponto ou _.'
  return undefined
}

/** Abrevia um endereço Ethereum: 0x1234…abcd. */
export function truncateAddress(address: string): string {
  if (address.length <= 10) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}
