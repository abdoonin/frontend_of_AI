'use client'

/**
 * Shared pieces of the tools screen.
 *
 * Geometry is taken from the PATIENTS screens, which are the visual base for
 * this product (LESSONS.md L-028): a `--surface-wide` panel at `--r-panel`
 * with `--glass-lift`, a 16px semibold title over a 12px muted description.
 * The readout inside sits on `--surface` — 30% over 24% is the pairing that
 * reads as raised, and the reverse reads as sunken (L-023).
 *
 * No `backdrop-filter` anywhere. Nothing in this product frosts.
 */

import type { ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/* ------------------------------------------------------------------ */

export function Panel({
  title,
  description,
  children,
  className = '',
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`flex flex-col rounded-[var(--r-panel)] bg-[var(--surface-wide)] p-[18px] shadow-[var(--glass-lift)] ${className}`}
    >
      <div className="mb-4">
        <h2 className="text-[16px] font-semibold text-[var(--ink)]">{title}</h2>
        {description && (
          <p className="mt-0.5 text-[12px] leading-[16px] text-[var(--ink-muted)]">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

/* ------------------------------------------------------------------ */

/**
 * A labelled numeric input.
 *
 * 14px label in `--ink` with the unit 12px and muted, rather than a 12px muted
 * label — hierarchy comes from weight and colour, not a size ladder
 * (PROJECT_STATE.md 5c, measured against Studio Admin).
 */
export function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
  placeholder = '—',
}: {
  id: string
  label: string
  unit?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[14px] font-medium leading-[20px] text-[var(--ink)]">
        {label}
        {unit && <span className="ml-1.5 text-[12px] font-normal text-[var(--ink-muted)]">{unit}</span>}
      </label>
      <Input
        id={id}
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="tabular-nums"
      />
    </div>
  )
}

/**
 * A labelled choice.
 *
 * shadcn's Select, never a native one. A native dropdown's popup is OS chrome —
 * its list, highlight and check mark cannot be styled in any browser, which is
 * how the light theme ended up showing an OS-blue highlight
 * (PROJECT_STATE.md Phase 3, carried decision 2).
 *
 * Quiet surface, not brand fill: this displays a chosen value, so it is STATE,
 * not an action (design rule 5). A toolbar where everything is green reads as a
 * wall of buttons.
 */
export function ChoiceField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[14px] font-medium leading-[20px] text-[var(--ink)]">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          className="h-9 w-full rounded-[var(--r-md)] bg-[var(--field)] text-[14px] text-[var(--ink)]"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/* ------------------------------------------------------------------ */

/**
 * The answer.
 *
 * `mt-auto` on the OUTER wrapper, so every card in a row ends with its readout
 * flush at the bottom however many inputs it has. Without it the cards stretch
 * to a shared height but their readouts sit wherever the fields end — the eGFR
 * card has a third control, so its answer landed 40px below the two beside it
 * and the row read as broken.
 *
 * That is not the same thing as design rule 19, which forbids `mt-auto` on the
 * NOTE inside a card. The note here still anchors to the value with `mt-1.5`,
 * because a two-line note pinned to the floor starts higher than a one-line one
 * and misaligns the row it sits in. Block to the floor, note to the value.
 *
 * 24px value against a 12px label and a 12px note. At 16px all three read as
 * one weight and the figure the reader came for does not win (rule 20).
 */
export function Readout({
  label,
  value,
  note,
  tone,
}: {
  label: string
  value: string
  note?: string
  tone?: string
}) {
  return (
    <div className="mt-auto pt-4">
      {/*
        Announced, because the result updates as you type rather than on a
        button press. Without a live region a screen-reader user gets no signal
        that the answer changed — the figure simply appears silently. Atomic so
        the label, value and note are read as one statement ("Draw up, 2 mL,
        2 mL delivers 500 mg") instead of three fragments.
      */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="rounded-[var(--r-card)] bg-[var(--surface)] p-4"
      >
        <p className="text-[12px] leading-[16px] text-[var(--ink-muted)]">{label}</p>
        <p
          className="mt-1 text-[24px] font-semibold leading-[30px] tracking-[-0.02em] tabular-nums"
          style={{ color: tone ?? 'var(--ink)' }}
        >
          {value}
        </p>
        {note && <p className="mt-1.5 text-[12px] leading-[16px] text-[var(--ink-muted)]">{note}</p>}
      </div>
    </div>
  )
}

/** Inputs side by side on anything wider than a phone. */
export function FieldRow({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return (
    <div className={`grid gap-4 ${cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>{children}</div>
  )
}
