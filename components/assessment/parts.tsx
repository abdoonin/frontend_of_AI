'use client'

/**
 * Shared pieces of the assessment screens.
 *
 * `FieldGrid` is the one that earns its place: it renders any list of field
 * keys from the registry, replacing roughly 400 lines of hand-written
 * per-field markup in `ai-radiology-scan.tsx` — 30 fields at ~13 lines each,
 * every one restating its own label, unit and range.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FIELD_BY_KEY } from '@/lib/assessment/fields'
import { PRESETS } from '@/lib/assessment/presets'
import type { Preset } from '@/lib/assessment/presets'
import type { Screen } from '@/lib/assessment/use-assessment'
import s from './assessment.module.css'

// ─────────────────────────────────────────────────────────────────────────

export function FieldGrid({
  keys,
  values,
  onChange,
}: {
  keys: readonly string[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}) {
  return (
    <div className={s.grid}>
      {keys.map((key) => {
        const field = FIELD_BY_KEY[key]
        if (!field) return null
        const id = `f-${key}`
        const range = field.rangeNote ?? rangeText(field.range)
        return (
          <div className={s.field} key={key}>
            <label htmlFor={id}>
              {field.label}
              {(field.unit || range) && (
                <span className={s.unit}>
                  {[field.unit, range && `normal ${range}`].filter(Boolean).join(', ')}
                </span>
              )}
            </label>
            {field.type === 'select' ? (
              /*
                shadcn's Select, not a native <select>. A native dropdown's
                popup is OS chrome -- its list, highlight and check mark cannot
                be styled in any browser, which is why the light theme showed an
                OS-blue highlight. This is a Radix popover the page renders
                itself, so it takes the tokens completely, in both themes.

                Radix uses `undefined` for "nothing selected"; an empty-string
                SelectItem throws.
              */
              <Select
                value={values[key] || undefined}
                onValueChange={(v) => onChange(key, v)}
              >
                <SelectTrigger
                  id={id}
                  className="h-9 w-full rounded-[var(--r-md)] border-[var(--field-border)] bg-[var(--surface)] text-[14px] shadow-[var(--glass-lift)] focus-visible:border-[var(--brand)] focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] data-[placeholder]:text-[var(--ink-muted)]"
                >
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <input
                id={id}
                inputMode="decimal"
                placeholder="—"
                value={values[key] ?? ''}
                onChange={(e) => onChange(key, e.target.value)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function rangeText(range?: { low?: number; high?: number }): string {
  if (!range) return ''
  const { low, high } = range
  if (low !== undefined && high !== undefined) return `${low}–${high}`
  return ''
}

// ─────────────────────────────────────────────────────────────────────────

/**
 * Sample data. The single most valuable control for a self-service judge —
 * one tap replaces typing thirty clinical values on a phone — so it is a
 * first-class action, and always labelled as sample data.
 */
export function PresetBar({ onApply }: { onApply: (preset: Preset) => void }) {
  return (
    <div className={s.presets}>
      <span className={s.presetLabel}>Sample data, for demonstration:</span>
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className={btn('primary', 'sm')}
          onClick={() => onApply(preset)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────

// "First check" everywhere the gate surfaces — the step rail, the donut on the
// results screen, and MODEL_LABEL.gate — so a judge meets one name for it.
const STEP_LABELS = ['Blood tests', 'First check', 'Detailed analysis', 'Results'] as const

/**
 * On the healthy path the assessment finishes at screen 2, so steps 3 and 4
 * are removed and step 2 is relabelled — leaving them visible tells the
 * clinician work remains and invites them to hunt for it.
 */
export function StepRail({ current, healthyPath }: { current: Screen; healthyPath: boolean }) {
  const shown = healthyPath ? [1, 2] : [1, 2, 3, 4]
  return (
    <div className={s.steps}>
      {shown.map((n, i) => (
        <div key={n} style={{ display: 'contents' }}>
          {i > 0 && <span className={s.sep} />}
          <div className={[s.step, n < current ? s.stepDone : '', n === current ? s.stepActive : ''].join(' ')}>
            <span className={s.dot}>{n}</span>
            <span className={s.lbl}>{healthyPath && n === 2 ? 'Results' : STEP_LABELS[n - 1]}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────

/**
 * Button classes, matching the shadcn v4 geometry the rest of the app uses:
 * default h-9 px-4 text-sm font-medium rounded-md, sm h-8 px-3.
 *
 * The outline variant fills with --surface-chrome rather than shadcn's
 * `bg-background`: their background is white and therefore brighter than the
 * card, ours is the sage ground and darker, so a literal port made buttons
 * sink into the page.
 */
export function btn(variant: 'primary' | 'outline' = 'outline', size: 'default' | 'sm' = 'default') {
  const base =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ' +
    'transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ' +
    'disabled:pointer-events-none disabled:opacity-50 cursor-pointer'
  const sizing = size === 'sm' ? 'h-8 px-3' : 'h-9 px-4'
  const look =
    variant === 'primary'
      ? 'bg-[var(--brand)] text-[var(--brand-ink)] hover:opacity-90'
      : 'border border-[var(--line)] bg-[var(--surface-chrome)] text-[var(--ink)] hover:bg-[var(--accent)]'
  return [base, sizing, look].join(' ')
}
