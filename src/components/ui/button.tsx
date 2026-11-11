import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-bold transition-[background-color,color,border-color,transform,box-shadow] duration-200 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-accent hover:shadow-[0_6px_20px_-6px_rgb(232_155_85_/_0.55)]',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-surface-2',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-primary bg-transparent text-accent hover:bg-primary/10',
        ghost: 'text-foreground hover:bg-tile hover:text-accent',
        link: 'text-accent underline-offset-4 hover:underline',
        pill: 'cta-gradient rounded-full text-primary-foreground hover:brightness-110 hover:shadow-[0_10px_28px_-10px_rgb(210_138_76_/_0.7)]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-6',
        pill: 'h-[60px] rounded-full px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** Estado pendente: desabilita o clique (proteção contra duplo envio) e mostra spinner. */
  isPending?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isPending = false, disabled, children, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size, className }))

    // ATENÇÃO (Radix Slot 1.2.x): no modo asChild, o filho do Slot precisa ser
    // LITERALMENTE um único elemento React — arrays (mesmo com entradas nulas)
    // falham em `React.isValidElement` e o Slot lança "Expected a single
    // React element child or `Slottable`". O spinner nunca é irmão do filho.
    if (asChild) {
      return (
        <Slot className={classes} ref={ref} {...props}>
          {children}
        </Slot>
      )
    }

    return (
      <button className={classes} ref={ref} disabled={disabled || isPending} aria-busy={isPending || undefined} {...props}>
        {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
