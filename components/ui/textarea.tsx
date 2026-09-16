import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * `bg-[var(--field)]`, matching `input.tsx`.
 *
 * PHASE 3 COLLISION 5 WAS ONLY EVER HALF-APPLIED. shadcn ships this with
 * `bg-transparent` and uses `--input` as a BORDER colour; the port fixed that
 * on `input.tsx` in August and left the textarea behind, so every multi-line
 * field in the product has been an outline with no fill ever since — visible
 * on the assistant's composer, which is what Ali reported ("it has just a
 * border, I want a proper frosted look").
 *
 * Fields are the brightest surface in this system; that lightness step is what
 * makes a field read as somewhere you type. `dark:bg-input/30` goes with it —
 * `--input` is our border token, so painting a fill from it was tinting the
 * field with its own outline.
 */
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-md border bg-[var(--field)] px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
