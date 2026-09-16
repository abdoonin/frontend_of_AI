'use client'

/**
 * Patients who need looking at, ranked.
 *
 * This is the Case Management replacement. Nothing on it is stored: every row
 * is computed from analyses that already exist, because the database has no
 * tasks, appointments or notes table to store anything in (verified
 * 2026-08-10). See `lib/worklist/rules.ts` for what the old tab did instead.
 *
 * Two requests, not N: `listPatients` and `listAllVisits` each fetch once and
 * are joined in memory. Fetching visits per patient would have reproduced
 * PROJECT_STATE.md problem 13, where one Reports render fired six identical
 * requests.
 *
 * IT REUSES `components/patients/data-table.tsx` RATHER THAN COPYING IT, so
 * the two screens cannot drift — same toolbar geometry, same brand-filled
 * actions against quiet filters, same pagination, same default page size of
 * 10. Every control that screen offers is opt-in on the component, and the
 * ones that do not earn their place here are simply not passed:
 *
 *   search      passed. Useless at five rows, correct at fifty, costs nothing
 *   flag filter passed. The one genuinely clinical filter -- "show me who is
 *               deteriorating" is a question a doctor actually asks
 *   sort        passed, but the DEFAULT stays the severity ranking. The
 *               ranking is what this screen is FOR; offering name A-Z as an
 *               alternative is fine, making it the default would gut it
 *   export      passed. A worklist is a thing you carry into rounds
 *   selection   NOT passed, so no checkbox column renders. There is no bulk
 *               action to attach: nothing here is storable, so "mark as done"
 *               has nowhere to write, and archiving from a follow-up list is
 *               the wrong verb. The component's own header says a checkbox
 *               leading nowhere is a broken promise
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Check, RotateCcw } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { CONTROL_CLASS, DataTable, type SortOption } from '@/components/patients/data-table'
import { listPatients, listAllVisits } from '@/lib/api/patients'
import {
  buildWorklist,
  countByKind,
  type Flag,
  type WorklistEntry,
  type FlagKind,
} from '@/lib/worklist/rules'
import { loadReviewed, saveReviewed, reviewKey } from '@/lib/worklist/reviewed'

/**
 * Colour per rule, applied at the CALL SITE rather than to a shared Badge
 * variant (design rule 8). Never colour alone — the badge carries its label
 * and the line beside it carries the numbers (rule 10, WCAG 2.2 §1.4.1).
 */
const FLAG_TONE: Record<FlagKind, string> = {
  'rising': 'var(--critical)',
  'high-mortality': 'var(--critical)',
  // Caution, not critical: a risk-FACTOR score is not a finding, and painting
  // it the same red as a 96% mortality risk would overstate it (B-17).
  'cancer-risk': 'var(--caution)',
  'advanced-overdue': 'var(--caution)',
}

const FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All concerns' },
  /* Covers BOTH badges the rising rule produces — "Getting worse" when the
     stage climbed and "Risk rising" when it held but the risk went up.
     Labelling this option "Getting worse" matched rows badged "Risk rising",
     which reads like the filter is broken. */
  { value: 'rising', label: 'Worse since last visit' },
  { value: 'high-mortality', label: 'Needs urgent review' },
  { value: 'cancer-risk', label: 'Cancer risk factors' },
  { value: 'advanced-overdue', label: 'Overdue a check' },
  /* The way back. Reviewed rows leave the default view but must stay
     reachable — a bulk action that hides rows with no way to see what was
     hidden is the "remove" behaviour Ali did not pick. */
  { value: 'reviewed', label: 'Reviewed' },
]

/**
 * Sorted by severity by default — which is the data order `buildWorklist`
 * already returns, and the table starts with an empty `sorting` state so it
 * preserves it.
 */
const SORT_OPTIONS: SortOption[] = [
  { label: 'Most urgent first', id: 'concern', desc: true },
  { label: 'Longest since analysis', id: 'last', desc: true },
  { label: 'Most recent analysis', id: 'last', desc: false },
  { label: 'Name A-Z', id: 'patient', desc: false },
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return ((parts[0][0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')).toUpperCase()
}

/**
 * The measured values inside a detail sentence — percentages, a point move on
 * a percentage, and a scarring stage.
 *
 * A capture group is used deliberately: `String.split` with one keeps the
 * separators in the result, at ODD indices, so the segments can be walked
 * without a second stateful `.test()` pass. A `/g` regex carries `lastIndex`
 * between calls and `.test()` would alternate true/false on identical input.
 */
const VALUE_TOKEN = /(\d+(?:\.\d+)?(?:%| points)|Stage \d+)/g

/**
 * One flag's evidence: the statement, and its qualifier on the line beneath.
 *
 * THE WORDS ARE NOT TOUCHED. Ali settled this copy on 2026-08-10 after raising
 * it twice (PROJECT_STATE.md 3d). What changes is where it breaks.
 *
 * THE RULE SUPPLIES THE TWO HALVES; THIS COMPONENT DOES NOT FIND THEM. Every
 * one of these findings is a statement plus something subordinate to it —
 * "fluid building up in the abdomen" glosses the term before it, "from
 * lifestyle and family history, with no imaging or biopsy" is the B-17 caveat
 * on what that model can see, "scarring stage unchanged" says why the flag is
 * a mortality trend and not a stage one. `lib/worklist/rules.ts` now states
 * that split itself, because it is the sentence's own structure.
 *
 * An earlier version searched the string for an em-dash instead, and that is
 * how the fault Ali reported got in: the one finding whose halves were joined
 * by a comma came out as a single unqualified line in a column where every
 * other statement had a second line under it, so it read as disconnected.
 *
 * Letting the browser choose the break was tried first and rejected on sight.
 * At 1440 the column is 572px and the longest sentence needs about 660px, so
 * it wrapped wherever the words ran out: first leaving "abdomen" alone on line
 * two, then — with `text-balance` — splitting "and 69.6% / risk of ascites",
 * which parts a value from the thing it measures. Both produced a fragment
 * line that reads as a rendering fault.
 *
 * THE SHAPE IS THE ONE THIS TABLE ALREADY USES, TWICE: a 14px statement in
 * `--ink` with a 12px qualifier in `--ink-muted` directly beneath it, flush
 * left, no gap. That is exactly the patient name over the patient ID, and
 * "18 days ago" over its date. This cell was the only one not following it.
 *
 * The em-dash never reaches the screen: it exists only in the derived `detail`
 * string that the export and the search box read. A rendered line beginning
 * with a dash reads as a list bullet, and here the line break plus the size
 * and colour step already carry the subordination the dash was carrying —
 * shape and size, not colour alone (design rule 10, WCAG 2.2 §1.4.1).
 *
 * THE VALUE TAKES WEIGHT. Four rows begin with the identical words "Mortality
 * risk", so the distinguishing information sat behind a repeated prefix and
 * the column read as one grey slab. `font-medium` on the value alone gives the
 * eye something to land on, and because those prefixes are identical,
 * `tabular-nums` puts 96.6 / 92.5 / 92.2 / 95.2 at the same horizontal
 * position down the column — they line up as a column of figures without being
 * one.
 */
function DetailLine({ flag }: { flag: Flag }) {
  return (
    <div>
      {/* `text-balance` is insurance, not the mechanism. Split into its two
          halves, the longest statement is 62 characters and fits one line from
          about 1250px up; below that this keeps the halves even rather than
          leaving a stub. */}
      <p className="text-[14px] leading-[20px] text-balance text-[var(--ink)]">
        {flag.statement.split(VALUE_TOKEN).map((part, i) =>
          i % 2 === 1 ? (
            // `whitespace-nowrap` so a value is never split by a wrap. The
            // two-word tokens are the ones at risk — "25 points" and "Stage 2".
            <span key={i} className="font-medium whitespace-nowrap">
              {part}
            </span>
          ) : (
            part
          ),
        )}
      </p>
      {flag.qualifier && (
        <p className="text-[12px] leading-[16px] text-[var(--ink-muted)]">{flag.qualifier}</p>
      )}
    </div>
  )
}

function daysWord(days: number): string {
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? 'a month ago' : `${months} months ago`
}

const columns: ColumnDef<WorklistEntry, any>[] = [
  {
    id: 'patient',
    header: 'Patient',
    accessorFn: (row) => `${row.patient.name} ${row.patient.patientId}`,
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-8 flex-none place-items-center rounded-full bg-[var(--accent)] text-[12px] font-medium text-[var(--ink)]"
        >
          {initials(row.original.patient.name)}
        </span>
        <span className="flex flex-col">
          <span className="text-[14px] font-medium text-[var(--ink)]">
            {row.original.patient.name}
          </span>
          <span className="text-[12px] tabular-nums text-[var(--ink-muted)]">
            #{row.original.patient.patientId}
          </span>
        </span>
      </div>
    ),
  },
  {
    id: 'concern',
    header: 'Concern',
    // The accessor feeds the global filter, so searching "overdue" finds the
    // overdue rows. Sorting is by SCORE, not by this string — the ranking is
    // the point of the screen and alphabetical badges would destroy it.
    accessorFn: (row) => row.flags.map((f) => f.label).join(' '),
    sortingFn: (a, b) => a.original.score - b.original.score,
    cell: ({ row }) => (
      <div className="flex flex-col items-start gap-1.5">
        {row.original.flags.map((flag) => (
          <span
            key={flag.kind}
            className="whitespace-nowrap rounded-[var(--r-pill)] px-2 py-0.5 text-[12px] font-medium"
            style={{
              color: FLAG_TONE[flag.kind],
              backgroundColor: `color-mix(in oklab, ${FLAG_TONE[flag.kind]} 14%, transparent)`,
            }}
          >
            {flag.label}
          </span>
        ))}
      </div>
    ),
  },
  {
    id: 'why',
    header: 'What the analysis found',
    accessorFn: (row) => [...row.flags.map((f) => f.detail), row.context ?? ''].join(' '),
    enableSorting: false,
    cell: ({ row }) => (
      /*
        `md:whitespace-normal` OVERRIDES `TableCell`, WHICH SETS
        `whitespace-nowrap` — and that one inherited word was the layout fault
        on this screen.

        Nothing in this cell could wrap, so the column was as wide as its single
        longest sentence (97 characters, "Mortality risk 96.6% with cirrhosis,
        and 69.6% risk of ascites — fluid building up in the abdomen") at every
        viewport, and the whole table was sized by the worst line in it. From
        `md` up the column now takes the room that is actually there: one
        statement on one line where it fits, wrapping where it does not.

        MEASURED, and this is the payoff. At 1920 every statement is one line
        and the rows come out 129 / 103 / 103 / 103 / 77 / 77 — the height
        differences are the number of concerns each patient carries, which is
        information. At 1440 the column is 572px, the ascites sentence needs
        about 660px, so those four rows take a second line and read
        129 / 103 → 149 / 123.

        Below `md` the cell keeps the table's own `nowrap` and the container's
        horizontal scroll, exactly as before this change. A phone has ~340px of
        column, where wrapping turns one statement into five lines and a row
        into a paragraph. Desktop is the priority here (Ali, 2026-08-10) and
        this costs it nothing — the breakpoint only restores the previous
        behaviour at the width where wrapping stops paying.

        NO `max-w` CEILING. One was tried and removed: the shell caps content at
        1364px even on a 2560 screen, so the column tops out at 738px and any
        ceiling above that is dead CSS. An earlier 68ch cap was worse than dead
        — it resolved to 557px against a 572px column and silently forced a wrap
        the available width did not require.

        `tabular-nums` matches every other numeric cell in this table, and here
        it does real work — see `DetailLine`.

        NO CROSS-COLUMN PAIRING IS CLAIMED. The previous version set these lines
        on the same 28px rhythm as the badges opposite so the two columns would
        read as pairs. It never worked: both cells are `align-middle`, so
        whenever a row carries a context line the taller block centres against
        the shorter one and the two columns sit 12px out of step — visible in
        Ali's screenshot on Mustafa's row. Each line names its own measure, so
        it does not need the badge opposite to explain it.
      */
      /* `gap-2` between findings against ZERO inside one. A statement and its
         qualifier sit on consecutive lines with no gap at all, so the interval
         that separates two findings has to be clearly bigger than the one that
         does not exist — 6px was not, and a finding with no qualifier read as a
         stray line rather than as a one-line member of the list. Rhythm is the
         tight interval measured against the loose one. */
      <div className="flex flex-col gap-2 tabular-nums md:whitespace-normal">
        {row.original.flags.map((flag) => (
          <DetailLine key={flag.kind} flag={flag} />
        ))}
        {/* Context, not a reason. 12px muted so it reads as secondary at a
            glance and never competes with a flag line — the same step this
            table already uses between a patient's name and their id.

            `mt-2` rather than the container's `gap-1.5`: the flag lines are the
            same KIND of statement as each other and belong tight together, and
            this is a different kind. One repeated gap made all four lines read
            as one list of four equal things — which is the "not organized" of
            Ali's note. Rhythm is the tighter interval against the looser one. */}
        {row.original.context && (
          <p className="mt-2 text-[12px] leading-[18px] text-[var(--ink-muted)]">
            {row.original.context}
          </p>
        )}
      </div>
    ),
  },
  {
    id: 'last',
    header: 'Last analysis',
    accessorFn: (row) => row.daysSince,
    cell: ({ row }) => (
      <span className="flex flex-col">
        <span className="text-[14px] tabular-nums text-[var(--ink)]">
          {daysWord(row.original.daysSince)}
        </span>
        {row.original.latest.createdAt && (
          <span className="text-[12px] tabular-nums text-[var(--ink-muted)]">
            {format(new Date(row.original.latest.createdAt), 'd MMM yyyy')}
          </span>
        )}
      </span>
    ),
  },
]

export function FollowUpList() {
  const router = useRouter()
  const [entries, setEntries] = useState<WorklistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [reviewed, setReviewed] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    // Read after mount, never during render: localStorage does not exist on
    // the server and reading it in the body would mismatch hydration.
    setReviewed(loadReviewed())
    Promise.all([listPatients('active'), listAllVisits()])
      .then(([patients, visits]) => {
        if (cancelled) return
        setEntries(buildWorklist(patients, visits))
      })
      .catch((e) => !cancelled && setError(e?.message ?? 'Could not load the worklist'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const keyOf = (e: WorklistEntry) => reviewKey(e.patient.patientId, e.latest.id, e.latest.createdAt)

  function setReviewedFor(rows: WorklistEntry[], value: boolean, clear: () => void) {
    const next = new Set(reviewed)
    for (const row of rows) {
      if (value) next.add(keyOf(row))
      else next.delete(keyOf(row))
    }
    setReviewed(next)
    saveReviewed(next)
    clear()
  }

  const viewingReviewed = filter === 'reviewed'

  /** Everything still awaiting attention — the list the summary describes. */
  const active = useMemo(
    () => entries.filter((e) => !reviewed.has(keyOf(e))),
    [entries, reviewed],
  )

  const shown = useMemo(() => {
    if (viewingReviewed) return entries.filter((e) => reviewed.has(keyOf(e)))
    if (filter === 'all') return active
    return active.filter((e) => e.flags.some((f) => f.kind === filter))
  }, [entries, active, reviewed, filter, viewingReviewed])

  const counts = countByKind(active)
  const summary = [
    counts.rising > 0 && `${counts.rising} worse since last visit`,
    counts['high-mortality'] > 0 && `${counts['high-mortality']} needing urgent review`,
    counts['cancer-risk'] > 0 && `${counts['cancer-risk']} with cancer risk factors`,
    counts['advanced-overdue'] > 0 && `${counts['advanced-overdue']} overdue a check`,
  ].filter(Boolean) as string[]

  if (loading) {
    return <p className="text-[14px] text-[var(--ink-muted)]">Loading…</p>
  }

  if (error) {
    return (
      <p role="alert" className="text-[14px] text-[var(--critical)]">
        {error}
      </p>
    )
  }

  return (
    <DataTable
      columns={columns}
      data={shown}
      title="Follow-up"
      description={
        viewingReviewed
          ? 'Already looked at — a new analysis brings a patient back to the list'
          : active.length === 0
            ? 'Worked out from every analysis on record'
            : `${summary.join(', ')} — worked out from their analyses`
      }
      searchPlaceholder="Search by name or patient ID..."
      sortOptions={SORT_OPTIONS}
      /* Five, matching Recent analyses on Reports. Ten rows of a worklist
         pushed the pager below the fold on a laptop, which is where the reader
         looks for it. */
      initialPageSize={5}
      /* ?from=follow-up so the profile's Back button returns here and says so,
         rather than dropping the reader on the full patient list. */
      onRowClick={(row) =>
        router.push(`/patients/${encodeURIComponent(row.patient.patientId)}?from=follow-up`)
      }
      toCsvRow={(row) => ({
        Patient: row.patient.name,
        'Patient ID': row.patient.patientId,
        Concern: row.flags.map((f) => f.label).join('; '),
        Detail: row.flags.map((f) => f.detail).join('; '),
        'Days since last analysis': row.daysSince,
        'Last analysis': row.latest.createdAt
          ? format(new Date(row.latest.createdAt), 'yyyy-MM-dd')
          : '',
      })}
      /*
        Selection exists because there is now an action to attach to it. It
        writes to localStorage rather than the database, which has no column
        for it — see lib/worklist/reviewed.ts for why that is acceptable here
        and was not acceptable in the tab this replaces.
      */
      bulkActions={(selected, clear) => (
        <>
          <Button
            variant="outline"
            size="sm"
            className={CONTROL_CLASS}
            onClick={() => setReviewedFor(selected, !viewingReviewed, clear)}
          >
            {viewingReviewed ? <RotateCcw /> : <Check />}
            {viewingReviewed ? 'Move back to the list' : 'Mark as reviewed'}
          </Button>
          {/* Quiet, per design rule 6: the consequential control is the one
              that stands out. */}
          <Button variant="outline" size="sm" onClick={clear}>
            Clear
          </Button>
        </>
      )}
      toolbar={
        <Select value={filter} onValueChange={setFilter}>
          {/* 190px, not the 130-160 the patients toolbar uses: its labels are
              "Active" and "Any time", and "Worse since last visit" clipped to
              "Worse since last vi" at 170. */}
          <SelectTrigger size="sm" className="h-9 w-[190px]" aria-label="Filter by concern">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      empty={
        /*
          A real answer, not a blank. An empty worklist means nobody is
          currently flagged, which is worth saying plainly — and it is the
          state a fresh deployment starts in.
        */
        <div className="py-6 text-center">
          <p className="text-[14px] text-[var(--ink)]">
            {viewingReviewed
              ? 'Nothing has been marked reviewed yet'
              : entries.length === 0
                ? 'No patient needs following up right now'
                : active.length === 0
                  ? 'Everything on the list has been reviewed'
                  : 'No patient matches this filter'}
          </p>
          <p className="mt-1 text-[12px] text-[var(--ink-muted)]">
            Patients appear here when an analysis shows worsening, a high mortality risk, or
            advanced scarring with no recent check
          </p>
        </div>
      }
    />
  )
}
