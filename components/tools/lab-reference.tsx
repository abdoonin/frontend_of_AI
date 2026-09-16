'use client'

/**
 * The reference tables.
 *
 * The ranges are READ FROM `lib/assessment/fields.ts`, the same declaration the
 * analysis form and the models use, so this table cannot drift from what the
 * product actually asks for. The old screen hand-wrote a generic five-row table
 * (glucose, haemoglobin, creatinine, ALT, cholesterol) that had nothing to do
 * with the thirty values this system collects.
 *
 * MULTI-COLUMN, NOT ONE LONG TABLE. Sixteen ranges and twelve abbreviations in
 * single columns beside each other produced a panel you had to scroll past and
 * a second panel half empty, because a grid row stretches to its tallest item.
 * These are not really tables — they are lookup lists, and a printed reference
 * sheet sets those in columns. Flowing them fixes the scroll and the dead space
 * at once, and hides nothing (Ali's option A, 2026-08-10).
 *
 * `break-inside-avoid` on each row is what keeps a term and its value from
 * being split across a column boundary — without it the flow will happily put
 * a label at the foot of one column and its number at the head of the next.
 */

import { labReference, ABBREVIATIONS } from '@/lib/tools/reference'
import { Panel } from './parts'

/** A term and its value, as one unbreakable unit in the column flow. */
function Row({
  term,
  children,
  termClass = '',
  align = 'between',
}: {
  term: string
  children: React.ReactNode
  termClass?: string
  align?: 'between' | 'start'
}) {
  return (
    <div
      className={`flex break-inside-avoid gap-3 border-b border-[var(--line)] py-2.5 ${
        align === 'between' ? 'items-baseline justify-between' : 'items-baseline'
      }`}
    >
      <dt className={`text-[14px] text-[var(--ink)] ${termClass}`}>{term}</dt>
      <dd className="text-[14px] text-[var(--ink)]">{children}</dd>
    </div>
  )
}

export function LabReference() {
  const rows = labReference()

  return (
    <Panel
      title="Reference ranges"
      description="Every laboratory value this analysis collects, and what counts as normal"
    >
      {/* Three columns on a wide screen, two at tablet, one on a phone. At
          three, each column is ~360px at the 1440 content cap — enough for the
          longest pairing ("Albumin / globulin" against "1–2.5") without
          wrapping. */}
      <dl className="columns-1 gap-x-8 sm:columns-2 lg:columns-3">
        {rows.map((row) => (
          <Row key={row.key} term={row.label}>
            <span className="tabular-nums">{row.range}</span>
            {row.unit && <span className="ml-1.5 text-[12px] text-[var(--ink-muted)]">{row.unit}</span>}
          </Row>
        ))}
      </dl>

      {/*
        A reference range is a clinical convention; the model's boundary is
        whatever its training data taught it, and here the two disagree sharply
        — mid-range values can still route a patient onward. Saying so turns
        what looks like a contradiction into the most instructive thing on the
        screen (PROJECT_STATE.md B-21, LESSONS.md L-024).
      */}
      <p className="mt-4 text-[12px] leading-[16px] text-[var(--ink-muted)]">
        Ranges vary between laboratories, and the analysis can reach a different
        conclusion from these figures — it learned its boundaries from data
        rather than from a threshold
      </p>
    </Panel>
  )
}

export function Abbreviations() {
  return (
    <Panel title="Abbreviations" description="The short forms used across this product">
      {/* Two columns, not three: these definitions are sentences rather than
          numbers, and at ~360px "Gamma-glutamyl transferase, sensitive to
          alcohol and fatty liver" wraps to three lines. */}
      <dl className="columns-1 gap-x-8 md:columns-2">
        {ABBREVIATIONS.map((a) => (
          <Row key={a.short} term={a.short} termClass="w-[64px] flex-none font-medium" align="start">
            <span className="text-[var(--ink-muted)]">{a.full}</span>
          </Row>
        ))}
      </dl>
    </Panel>
  )
}
