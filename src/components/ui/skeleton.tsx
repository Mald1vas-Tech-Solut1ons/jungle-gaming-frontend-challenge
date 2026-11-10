import { cn } from '@/lib/utils'

/** Bloco de carregamento com shimmer (a animação respeita `prefers-reduced-motion`). */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton', className)} aria-hidden="true" {...props} />
}

export { Skeleton }
