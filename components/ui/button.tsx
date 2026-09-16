import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        // bg-[--surface-chrome], NOT shadcn's bg-background. Their background
        // is white and therefore BRIGHTER than the surfaces around it; ours is
        // the sage page ground and darker, so a literal port made every outline
        // button sink into the page instead of sitting on it. The assessment
        // screens worked around this with a local btn() helper -- this is that
        // fix moved to the primitive, so there is one button system again.
        // Brand ink and a brand-tinted border, not neutral --ink on --line.
        // The fill alone made these read as inert chrome against the sage
        // ground; the green is what says 'press me'. --brand flips per theme
        // -- deep green on light, pale sage on dark -- so one rule serves both.
        outline:
          'border border-[color-mix(in_oklab,var(--brand)_38%,transparent)] bg-[var(--surface-chrome)] text-[var(--brand)] hover:bg-[var(--accent)] hover:border-[var(--brand)]',
        // --secondary maps to --surface-sunk, a 5% wash that is invisible as a
        // button fill. A quiet FILLED control, no border, so it reads as a
        // sibling of the primary rather than a weaker outline.
        secondary:
          'bg-[var(--accent)] text-[var(--ink)] hover:bg-[var(--accent)]/70',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
