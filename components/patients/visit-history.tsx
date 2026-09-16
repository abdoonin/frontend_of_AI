'use client'

/**
 * Every analysis run on one patient, and what each one saw.
 *
 * The detail panel is the reason the inputs are now stored. Before this, a
 * saved analysis showed a result with no sight of the values that produced it
 * — `lab_tests` has zero rows because its write path is dead (B-6), so nothing
 * anywhere recorded what was measured. Records written from 2026-08-09 carry
 * their inputs; older ones say so plainly rather than showing blanks.
 */

import { useState } from 'react'
import { format } from 'date-fns'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FIELD_BY_KEY } from '@/lib/assessment/fields'
import type { Visit } from '@/lib/api/patients'
import { stageDescription } from '@/lib/clinical/stages'

function finding(v: Visit): { text: string; tone: string } {
  if (!v.hasResults) return { text: 'No signs of liver disease', tone: 'var(--normal)' }
  if (v.stage !== null) {
    return {
      text: `Liver scarring Stage ${v.stage}`,
      tone: v.stage >= 3 ? 'var(--critical)' : v.stage >= 2 ? 'var(--caution)' : 'var(--normal)',
    }
  }
  if (v.fattyProbabilityPct !== null && v.fattyProbabilityPct >= 50) {
    return { text: 'Fatty liver likely', tone: 'var(--critical)' }
  }
  if (v.cancerRiskPct !== null) {
    return { text: `Cancer risk ${v.cancerRiskPct}%`, tone: 'var(--caution)' }
  }
  return { text: 'Assessed', tone: 'var(--ink-muted)' }
}

/**
 * The per-model numbers this visit produced. Only what actually ran.
 *
 * `text` marks the one row that is not a figure. Six of these are percentages
 * or scores and are set as figures — 14px, medium, tabular. The stage carries
 * its full clinical wording ("Stage 3: Advanced Stage / Liver Cirrhosis (F4)")
 * and is prose, so it is set as prose at 12px and fits the one line Ali asked
 * for. Measured: at 14px medium the string is 306px against 268px of room, so
 * it took two lines; at 12px regular it is 256px, with 12px to spare.
 *
 * The distinction is by KIND, not by length — a figure stays a figure however
 * short the string, so this does not become "shrink whatever overflows".
 */
function results(v: Visit): { label: string; value: string; text?: boolean }[] {
  const out: { label: string; value: string; text?: boolean }[] = []
  if (v.cancerRiskPct !== null) out.push({ label: 'Cancer risk', value: `${v.cancerRiskPct}%` })
  if (v.fattyProbabilityPct !== null)
    out.push({ label: 'Probability of fatty liver', value: `${v.fattyProbabilityPct}%` })
  /*
    "Scarring stage", not "Liver scarring stage".

    The value is the long half and it is the half that must not wrap. Measured
    in the open sheet: the row is 393px, the longer label takes 128px, and after
    a 12px gap that leaves 253px for a value needing 256px at 12px — three
    pixels short, and 11px is off the 12/14/16 scale. Dropping "Liver" frees
    about 38px, which turns three pixels short into thirty-five to spare, so the
    line survives a font fallback rather than fitting only when Geist loads.

    Nothing is lost: this sits inside one patient's record, in a product that
    does nothing but livers, two rows under "Probability of fatty liver".
  */
  if (v.stage !== null)
    out.push({ label: 'Scarring stage', value: stageDescription(v.stage), text: true })
  if (v.ascitesRiskPct !== null)
    out.push({ label: 'Ascites risk', value: `${v.ascitesRiskPct}%` })
  if (v.apriScore !== null) out.push({ label: 'APRI score', value: `${v.apriScore}` })
  if (v.albiScore !== null) out.push({ label: 'ALBI score', value: `${v.albiScore}` })
  if (v.mortalityRiskPct !== null)
    out.push({ label: 'Mortality risk', value: `${v.mortalityRiskPct}%` })
  return out
}

export function VisitHistory({ visits }: { visits: Visit[] }) {
  const [open, setOpen] = useState<Visit | null>(null)

  return (
    <section className="rounded-[var(--r-panel)] bg-[var(--surface-wide)] p-[22px] shadow-[var(--glass-lift)]">
      <div className="mb-4">
        <h2 className="text-[16px] font-semibold text-[var(--ink)]">
          Visit history ({visits.length})
        </h2>
        <p className="text-[12px] text-[var(--ink-muted)]">
          Every analysis run on this patient, most recent first
        </p>
      </div>

      {visits.length === 0 ? (
        <p className="py-6 text-center text-[14px] text-[var(--ink-muted)]">
          No analysis has been run for this patient yet
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--r-md)] bg-[var(--surface)]">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[var(--line)] hover:bg-transparent">
                <TableHead className="text-[12px] text-[var(--ink-muted)]">Visit</TableHead>
                <TableHead className="text-[12px] text-[var(--ink-muted)]">Date</TableHead>
                <TableHead className="text-[12px] text-[var(--ink-muted)]">Finding</TableHead>
                <TableHead className="text-[12px] text-[var(--ink-muted)]">Values recorded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visits.map((v, i) => {
                const f = finding(v)
                return (
                  <TableRow
                    key={v.id}
                    tabIndex={0}
                    role="button"
                    onClick={() => setOpen(v)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setOpen(v)
                      }
                    }}
                    className="cursor-pointer border-b border-[var(--line)] last:border-0 hover:bg-[var(--accent)] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {/* Numbered oldest-first so a visit keeps its number as new
                        ones are added. The list is newest-first. */}
                    <TableCell className="py-3 text-[14px] tabular-nums text-[var(--ink)]">
                      #{visits.length - i}
                    </TableCell>
                    <TableCell className="py-3 text-[14px] tabular-nums text-[var(--ink-muted)]">
                      {v.createdAt ? format(new Date(v.createdAt), 'd MMM yyyy, HH:mm') : '—'}
                    </TableCell>
                    <TableCell className="py-3 text-[14px]" style={{ color: f.tone }}>
                      {f.text}
                    </TableCell>
                    <TableCell className="py-3 text-[14px] text-[var(--ink-muted)]">
                      {v.inputs ? `${Object.keys(v.inputs).length} values` : 'Not recorded'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[440px]">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {open.createdAt
                    ? format(new Date(open.createdAt), "d MMM yyyy 'at' HH:mm")
                    : 'Analysis'}
                </SheetTitle>
                <SheetDescription>{open.diagnosis || 'Analysis result'}</SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-6 px-4 pb-8">
                <div>
                  <h3 className="mb-2 text-[14px] font-medium text-[var(--ink)]">What was found</h3>
                  {results(open).length === 0 ? (
                    /*
                      THE WORD, THEN THE PROVENANCE. This said only "The first
                      check found no signs of liver disease, so no detailed
                      model was run" — true, and the one visit type in the
                      product with no headline at all, so a healthy result read
                      as an absence of information rather than as a finding.

                      `--normal` is the clinical normal token, which resolves to
                      the deep green #163832 on light and to the same green as
                      `--brand` on dark. It is the semantically correct colour
                      here AND the one Ali asked for; no new colour is
                      introduced.

                      The sentence beneath still says WHICH check concluded it.
                      That matters: the gate found no signs, the staging model
                      never ran, and B-21 is the standing reminder that those
                      are different statements.
                    */
                    <div>
                      <p className="text-[16px] font-semibold" style={{ color: 'var(--normal)' }}>
                        Healthy
                      </p>
                      <p className="mt-1 text-[14px] text-[var(--ink-muted)]">
                        The first check found no signs of liver disease, so no detailed model was
                        run
                      </p>
                    </div>
                  ) : (
                    <dl className="flex flex-col">
                      {results(open).map((r) => (
                        <div
                          key={r.label}
                          /* gap-3, not gap-4: the four extra pixels are what
                             take the stage line from 8px of slack to 12px, and
                             a value that fits only if the font loads is not
                             fitting. */
                          className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] py-2 last:border-0"
                        >
                          {/*
                            THE LABEL NEVER WRAPS; THE VALUE MAY.

                            Every label here is two or three words and fits one
                            line at this sheet's 440px. Only one value is long —
                            the stage carries its full clinical wording, "Stage
                            3: Advanced Stage / Liver Cirrhosis (F4)" — and
                            without `flex-none` the two boxes negotiated for
                            width, so that one row broke "Liver scarring stage"
                            over two lines to make room. A label that wraps on
                            one row out of seven reads as a fault.

                            `text-right` on the value because a wrapped `dd` is
                            only as wide as its content, so its second line was
                            left-aligned inside a right-hand box and looked
                            centred against the column of figures above it.
                          */}
                          <dt className="flex-none text-[14px] whitespace-nowrap text-[var(--ink)]">
                            {r.label}
                          </dt>
                          <dd
                            className={
                              r.text
                                ? 'text-right text-[12px] leading-[18px] text-[var(--ink)]'
                                : 'text-right text-[14px] font-medium tabular-nums text-[var(--ink)]'
                            }
                          >
                            {r.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 text-[14px] font-medium text-[var(--ink)]">
                    Values entered
                  </h3>
                  {!open.inputs ? (
                    <p className="text-[14px] text-[var(--ink-muted)]">
                      Not recorded. Analyses saved before 9 August 2026 did not store the values
                      they were run on
                    </p>
                  ) : (
                    <dl className="flex flex-col">
                      {Object.entries(open.inputs).map(([key, value]) => {
                        const field = FIELD_BY_KEY[key]
                        return (
                          <div
                            key={key}
                            className="flex items-baseline justify-between gap-4 border-b border-[var(--line)] py-2 last:border-0"
                          >
                            <dt className="text-[14px] text-[var(--ink-muted)]">
                              {field?.label ?? key}
                            </dt>
                            <dd className="text-[14px] tabular-nums text-[var(--ink)]">
                              {value}
                              {field?.unit ? ` ${field.unit}` : ''}
                            </dd>
                          </div>
                        )
                      })}
                    </dl>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  )
}
