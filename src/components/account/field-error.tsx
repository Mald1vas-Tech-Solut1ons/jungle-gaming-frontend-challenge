import type { ReactNode } from 'react'

interface FieldErrorProps {
  /** id apontado pelo `aria-describedby` do campo correspondente. */
  id: string
  children?: ReactNode
}

/** Mensagem de erro de campo, exibida abaixo do input correspondente. */
export function FieldError({ id, children }: FieldErrorProps) {
  if (!children) return null
  return (
    <p id={id} className="text-sm text-destructive" role="alert">
      {children}
    </p>
  )
}
