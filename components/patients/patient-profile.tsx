'use client'

/**
 * One patient: who they are, and every analysis ever run on them.
 *
 * `medical_reports` is already one row per analysis with a timestamp, so this
 * needed no schema change — only a screen. Measured on the live database
 * though, all 15 patients hold exactly ONE analysis each, so a single visit is
 * the normal case here, not the edge case. Nothing on this screen assumes a
 * trend, and the history reads correctly with one row.
 *
 * AGE AND SEX COME FROM THE ANALYSIS, NOT THE PATIENT RECORD, and that is
 * deliberate. `patients` has no sex column (B-4) and `birth_date` is an
 * unvalidated VARCHAR holding 2024-2026 dates, which is why the old screens
 * print "Age: 0" for real people (B-5). Both values ARE known accurately —
 * they were typed in to run the models — so they are read from the visit that
 * recorded them and labelled as being from that visit.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getPatient, listVisits, type Patient, type Visit } from '@/lib/api/patients'
import { STAGE_LABEL } from '@/lib/clinical/stages'
import { CONTROL_CLASS } from './data-table'
import { PatientActions } from './patient-actions'
import { VisitHistory } from './visit-history'
/* The assessment's own charts and the card surface they were designed in.
   Importing the module rather than restating its rules is what keeps a chart
   on this page identical to the same chart on the result screen. */
import { OutOfRange, StageDistribution, TriageDonut } from '@/components/assessment/charts'
import a from '@/components/assessment/assessment.module.css'

/**
 * One headline figure, as its own frosted card.
 *
 * The dividing rules this replaced were doing a border's job without being a
 * border — Ali's words, and he is right: three cells split by hairlines read
 * as a table fragment, not as three facts. Separate surfaces separate them
 * without drawing anything.
 *
 * The 32px radius is a deliberate departure from the 6/8/10/14 token scale, on
 * Ali's instruction. It is confined to these three cards; nothing else in the
 * product uses it.
 *
 * `note` is the reason each card earns its space. A label and a number alone
 * left the panel almost empty, so every card carries a second, real fact
 * derived from the same data — never a filler line.
 */
function Stat({
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
    <div className="rounded-[32px] bg-[var(--surface)] p-5 shadow-[var(--glass-lift)]">
      <p className="text-[12px] text-[var(--ink-muted)]">{label}</p>
      {/* 24px. At 16px the value sat between a 12px label and a 12px note and
          the card read as three lines of the same weight -- the number a
          doctor is looking for has to win. 30px was tried and was too loud for
          a card this size. Off the 12/14/16/30 scale, like the 19px readout on
          the analysis screen, and for the same reason: a headline figure is
          not body text. */}
      <p
        className="mt-1 text-[24px] leading-[30px] font-semibold tracking-[-0.02em] tabular-nums"
        style={{ color: tone ?? 'var(--ink)' }}
      >
        {value}
      </p>
      {/* mt-2, NOT mt-auto. Bottom-anchoring pinned every note to the
          floor of the card, so a two-line note started higher up than a
          one-line one and the three cards read as misaligned. Anchored to
          the value instead, they all start at the same offset. */}
      {note && <p className="mt-2 text-[12px] leading-[16px] text-[var(--ink-muted)]">{note}</p>}
    </div>
  )
}

/**
 * Where "Back" goes, and what it says.
 *
 * A patient profile is reachable from more than one list, and a Back button
 * that always returned to /patients sent people somewhere they had not been —
 * arriving from the follow-up worklist and landing on the full patient list
 * loses your place and reads as a bug.
 *
 * The origin travels as `?from=` rather than through history or a referrer
 * check, so it survives a reload, a bookmark and a shared link. An unknown or
 * absent value falls back to the patient list, which is the correct answer for
 * anyone who typed the URL directly.
 */
export interface BackTarget {
  href: string
  label: string
  /** The middle breadcrumb, so the trail matches the button. */
  crumb: string
}

const BACK_TARGETS: Record<string, BackTarget> = {
  'follow-up': { href: '/follow-up', label: 'Back to follow-up', crumb: 'Follow-up' },
  reports: { href: '/reports', label: 'Back to reports', crumb: 'Reports' },
  patients: { href: '/patients', label: 'Back to patients', crumb: 'Patients' },
}

export const DEFAULT_BACK: BackTarget = {
  href: '/patients',
  label: 'Back to patients',
  crumb: 'Patients',
}

/**
 * THE ORIGIN IS REMEMBERED, not only read from the URL.
 *
 * `?from=` alone is lost the moment the reader leaves and comes back by any
 * route that does not carry it — open a patient from Reports, go to another
 * page, return, and Back said "Back to patients" and dropped you on a list you
 * had never been on. Ali, 2026-08-12.
 *
 * So the URL still decides when it says anything, and what it said is kept per
 * patient for when it does not. sessionStorage, not local: it should last as
 * long as the tab and no longer.
 */
const ORIGIN_KEY = 'hepatiq.profile-origin'

function rememberOrigin(patientId: string, from: string): void {
  try {
    sessionStorage.setItem(`${ORIGIN_KEY}.${patientId}`, from)
  } catch {
    /* private mode or quota — the URL still works, only the memory is lost */
  }
}

function recallOrigin(patientId: string): string | null {
  try {
    return sessionStorage.getItem(`${ORIGIN_KEY}.${patientId}`)
  } catch {
    return null
  }
}

export function backTargetFor(from: string | null | undefined): BackTarget {
  return (from && BACK_TARGETS[from]) || DEFAULT_BACK
}

/**
 * The back target for a patient, preferring an explicit `?from=` and falling
 * back to wherever this patient was last opened from in this tab.
 */
export function resolveBackTarget(patientId: string, from: string | null): BackTarget {
  if (from) {
    rememberOrigin(patientId, from)
    return backTargetFor(from)
  }
  return backTargetFor(recallOrigin(patientId))
}

/** Two letters, matching the avatar in the patients table. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return ((parts[0][0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')).toUpperCase()
}

/**
 * The stage card's note now carries the CLINICAL label rather than a plain
 * paraphrase, because it sits directly under the number: "Stage 2" above,
 * "Intermediate Stage (F2, F3)" beneath. Together they read as one statement,
 * and the F-mapping is what a hepatologist actually needs.
 *
 * The paraphrase it replaced ("Established scarring") said less in the same
 * space — the note already had a date to carry, so there was never room for
 * both, and of the two the clinical label is the one that cannot be guessed
 * from the number above it.
 */

function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? 'a month ago' : `${months} months ago`
}

export function PatientProfile({
  patientId,
  back = DEFAULT_BACK,
}: {
  patientId: string
  back?: BackTarget
}) {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([getPatient(patientId), listVisits(patientId)])
      .then(([p, v]) => {
        if (cancelled) return
        setPatient(p)
        setVisits(v)
      })
      .catch((e) => !cancelled && setError(e?.message ?? 'Could not load this patient'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [patientId])

  if (loading) return <p className="text-[14px] text-[var(--ink-muted)]">Loading…</p>

  if (error || !patient) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-[14px] text-[var(--critical)]">
          {error ?? `No patient found with ID ${patientId}.`}
        </p>
        <Button variant="outline" asChild>
          <Link href={back.href}>{back.label}</Link>
        </Button>
      </div>
    )
  }

  const latest = visits[0] ?? null
  // The most recent visit that actually recorded its inputs. Older records
  // never stored them, so an older patient simply has no sex or age on file.
  const withInputs = visits.find((v) => v.inputs !== null) ?? null
  // The newest visit that stored anything the charts can draw. Not necessarily
  // the newest visit: a healthy-path record keeps its inputs but reaches no
  // model, and the oldest records stored neither.
  const chartVisit =
    visits.find(
      (v) => v.inputs !== null || v.stageDistribution !== null || v.gateProbabilitySick !== null,
    ) ?? null

  /*
    How many of the three this visit can draw, and therefore how wide each one
    is. A healthy-path visit has inputs and no model output at all, so it draws
    one chart — which at half width left the panel half empty.

    Four columns: 2/1/1 when all three are present, 2/2 for two, 4 for one.
  */
  const chartCount =
    (chartVisit?.inputs ? 1 : 0) +
    (chartVisit?.stageDistribution ? 1 : 0) +
    (chartVisit?.gateProbabilitySick !== null && chartVisit !== null ? 1 : 0)
  const valuesSpan =
    chartCount === 1 ? 'lg:col-span-4' : 'lg:col-span-2'
  const modelSpan = chartCount === 1 ? 'lg:col-span-4' : chartCount === 2 ? 'lg:col-span-2' : ''
  const sex = withInputs?.inputs?.gender ?? null
  const age = withInputs?.inputs?.age ?? null

  const staged = visits.find((v) => v.stage !== null)
  const previous = visits[1] ?? null

  /*
    "Change since last visit" replaced a count of analyses, which the "Visit
    history (N)" heading two panels down already states. A count is not a
    finding.

    This is the one thing on the screen that needs two visits to exist, and
    with every patient in the database holding exactly one, it will usually say
    so. That is deliberate: it names the missing step instead of showing a
    blank, and it is the step that makes monitoring worth anything.

    Stage is compared first because it is the coarsest real change; mortality
    risk is the fallback when both visits produced one. If the two most recent
    analyses ran different checks they are not comparable, and it says that
    rather than inventing a delta.
  */
  const change: { value: string; note: string; tone: string } = (() => {
    if (!latest) return { value: '—', note: 'No analysis has been run', tone: 'var(--ink-muted)' }
    if (!previous) {
      return {
        value: 'First',
        note: 'Run a second analysis to compare',
        // The same --normal as "Healthy" beside it (Ali, 2026-08-12). One
        // token, so it follows each theme's own tuned green rather than two
        // hardcoded values that would need checking twice.
        tone: 'var(--normal)',
      }
    }
    if (latest.stage !== null && previous.stage !== null) {
      const delta = latest.stage - previous.stage
      const span = `Stage ${previous.stage} to Stage ${latest.stage}`
      if (delta > 0) {
        return { value: `+${delta} stage${delta > 1 ? 's' : ''}`, note: `Worse, ${span}`, tone: 'var(--critical)' }
      }
      if (delta < 0) {
        return { value: `−${-delta} stage${-delta > 1 ? 's' : ''}`, note: `Better, ${span}`, tone: 'var(--normal)' }
      }
      return { value: 'No change', note: `Still Stage ${latest.stage}`, tone: 'var(--ink-muted)' }
    }
    if (latest.mortalityRiskPct !== null && previous.mortalityRiskPct !== null) {
      const delta = Math.round((latest.mortalityRiskPct - previous.mortalityRiskPct) * 10) / 10
      if (Math.abs(delta) < 0.1) {
        return { value: 'No change', note: 'Mortality risk is unchanged', tone: 'var(--ink-muted)' }
      }
      return {
        value: `${delta > 0 ? '+' : ''}${delta}%`,
        note: 'Change in mortality risk',
        tone: delta > 0 ? 'var(--critical)' : 'var(--normal)',
      }
    }
    return {
      value: 'Not comparable',
      note: 'The two most recent analyses ran different checks',
      tone: 'var(--ink-muted)',
    }
  })()

  /*
    The stage card, which had no way to say "healthy".

    It showed an em-dash and "No detailed check has staged this patient" for a
    patient the gate had cleared — technically true and completely flat: the one
    outcome a doctor most wants to see at a glance rendered as a missing value.
    Ali, 2026-08-10: the card should say Healthy, in the deep green.

    `--normal` is the clinical normal token. It resolves to #163832 on light —
    deeper than `--brand` — and to the same green as `--brand` on dark, so it is
    both the semantically correct token and the colour asked for.

    ORDER MATTERS, AND THE STAGE WINS. A patient staged at any point keeps that
    number, dated in the note. Only a patient nothing ever staged, whose most
    recent check found no signs, reads Healthy — and the note names WHICH check
    concluded it, because the gate clearing a patient and the staging model
    finding no scarring are different statements (B-21).
  */
  const stageCard: { value: string; note: string; tone: string } = (() => {
    if (staged && staged.stage !== null) {
      const dated = staged.createdAt ? `, ${format(new Date(staged.createdAt), 'd MMM yyyy')}` : ''
      return {
        value: `Stage ${staged.stage}`,
        note: `${STAGE_LABEL[staged.stage] ?? ''}${dated}`,
        tone:
          staged.stage >= 3
            ? 'var(--critical)'
            : staged.stage >= 2
              ? 'var(--caution)'
              : 'var(--normal)',
      }
    }
    if (!latest) {
      return { value: '—', note: 'No analysis has been run', tone: 'var(--ink-muted)' }
    }
    if (!latest.hasResults) {
      const dated = latest.createdAt ? `, ${format(new Date(latest.createdAt), 'd MMM yyyy')}` : ''
      return {
        value: 'Healthy',
        note: `The first check found no signs of liver disease${dated}`,
        tone: 'var(--normal)',
      }
    }
    return {
      value: '—',
      note: 'No detailed check has staged this patient',
      tone: 'var(--ink-muted)',
    }
  })()

  const latestFinding: { text: string; tone: string } = !latest
    ? { text: 'None yet', tone: 'var(--ink-muted)' }
    : !latest.hasResults
      ? { text: 'No signs of liver disease', tone: 'var(--normal)' }
      : latest.stage !== null
        ? {
            text: `Liver scarring Stage ${latest.stage}`,
            tone: latest.stage >= 3 ? 'var(--critical)' : latest.stage >= 2 ? 'var(--caution)' : 'var(--normal)',
          }
        : latest.fattyProbabilityPct !== null && latest.fattyProbabilityPct >= 50
          ? { text: 'Fatty liver likely', tone: 'var(--critical)' }
          : latest.cancerRiskPct !== null
            ? { text: `Cancer risk ${latest.cancerRiskPct}%`, tone: 'var(--caution)' }
            : { text: 'Assessed', tone: 'var(--ink-muted)' }

  const identity = [
    sex,
    age ? `${age} years` : null,
    patient.phone,
    patient.email,
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" className={CONTROL_CLASS} asChild>
          <Link href={back.href}>
            <ArrowLeft />
            {back.label}
          </Link>
        </Button>
        <PatientActions patient={patient} visitCount={visits.length} onChanged={setPatient} />
      </div>

      {/* ONE panel for "who this patient is" — identity and their headline
          figures together, because they are one subject. The visit history
          below is a different subject and keeps its own panel. */}
      <section className="rounded-[var(--r-panel)] bg-[var(--surface-wide)] shadow-[var(--glass-lift)]">
        <div className="flex flex-wrap items-start justify-between gap-4 p-[22px]">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="grid size-11 flex-none place-items-center rounded-full bg-[var(--accent)] text-[14px] font-medium text-[var(--ink)]"
            >
              {initials(patient.name)}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[16px] font-semibold text-[var(--ink)]">{patient.name}</h1>
                {patient.status === 'archived' && <Badge variant="outline">Archived</Badge>}
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px] text-[var(--ink-muted)]">
                <span className="tabular-nums">#{patient.patientId}</span>
                {identity.map((item) => (
                  <span key={item} className="flex items-center gap-x-2.5">
                    {/* A drawn rule, not a middot. Ali has asked twice for
                        those to go; the assessment screens already separate
                        facts this way (.patientRule). */}
                    <span
                      aria-hidden="true"
                      className="inline-block h-[11px] w-px bg-[var(--line-strong)]"
                    />
                    {item}
                  </span>
                ))}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[12px] text-[var(--ink-muted)]">Patient since</p>
            <p className="text-[14px] tabular-nums text-[var(--ink)]">
              {patient.createdAt ? format(new Date(patient.createdAt), 'd MMM yyyy') : '—'}
            </p>
          </div>
        </div>

        {/* Inside the panel, not beside it: these three figures describe the
              patient, so they belong to the same object. --surface on a
              --surface-wide panel is the lifted pairing L-023 prescribes -- 30%
              over 24% reads as raised; the reverse reads as sunken. */}
          <div className="grid gap-4 px-[22px] pb-[22px] sm:grid-cols-3">
          <Stat
            label="Liver scarring stage"
            value={stageCard.value}
            note={stageCard.note}
            tone={stageCard.tone}
          />
          <Stat
            label="Change since last visit"
            value={change.value}
            note={change.note}
            tone={change.tone}
          />
          <Stat
            label="Last analysis"
            value={
              latest?.createdAt
                ? daysAgo(latest.createdAt).replace(/^./, (c) => c.toUpperCase())
                : '—'
            }
            note={
              latest?.createdAt
                ? format(new Date(latest.createdAt), 'd MMM yyyy, HH:mm')
                : 'No analysis has been run'
            }
          />
        </div>
      </section>


      {/*
        THE RESULT CHARTS, ON THE PATIENT RATHER THAN THE RUN.

        These are the same three components the assessment's own result screen
        renders — imported, not reimplemented, so there is one version of each
        to keep right. Until now they were drawn once, on the screen that
        produced them, and were unreachable the moment you navigated away; the
        record survived in the database and its picture did not.

        WHICH VISIT. The most recent one that stored enough to draw, named in
        the heading so it can never be mistaken for a summary of the patient's
        whole history. Each card is independently conditional because coverage
        is uneven: measured across the live database, roughly a third of
        records carry inputs, gate and staging, a third carry inputs alone, and
        the oldest carry model output with no inputs at all. A visit shows what
        it has and says nothing about what it does not.
      */}
      {/* The table comes first: it is the record, and the charts describe one
          row of it. Ali's order, 2026-08-12. */}
      <VisitHistory visits={visits} />

      {chartVisit && (
        /*
          A PANEL HOLDING THREE CARDS — variant A, chosen from the three shown
          on 2026-08-12.

          It IS a card inside a card, which DESIGN_RECON records the reference
          interface never does, and the outlined variant that avoided the nest
          was on the table. Ali picked this one after seeing both in dark and
          light. Recording it so the next reader knows the rule was weighed
          rather than missed.

          The heading belongs to the panel, which is what stopped it reading as
          unattached when it floated above three loose tiles.

          HEIGHTS ARE EXPLICIT AND EQUAL. `ChartContainer` sizes its plot from
          a parent with a DEFINITE height; against `min-height` the box renders
          and the plot measures zero, drawing nothing at all. One height across
          the row also keeps the three cards level, which a grid of differing
          intrinsic heights would not.
        */
        <section className="rounded-[var(--r-panel)] bg-[var(--surface-wide)] p-[22px] shadow-[var(--glass-lift)]">
          <div className="mb-4">
            <h2 className="text-[16px] font-semibold text-[var(--ink)]">Analysis charts</h2>
            <p className="text-[12px] text-[var(--ink-muted)]">
              {chartVisit.createdAt
                ? `From the analysis of ${format(new Date(chartVisit.createdAt), 'd MMM yyyy')}, this patient's most recent`
                : "From this patient's most recent analysis"}
            </p>
          </div>

          {/*
            2fr + 1fr + 1fr: half the row for the values, a quarter each for
            the two model outputs. One column below the laptop breakpoint — at
            a quarter of a tablet the donut has no room for its legend.

            THE ROW ALWAYS FILLS. A healthy-path visit stores its inputs and
            reaches no model, so it has one chart, not three — and at half
            width that left the right half of the panel empty (Ali,
            2026-08-12). The spans are worked out from how many charts this
            visit can actually draw, so one chart takes the whole row and two
            take half each. Nothing is stretched to hide a gap; there simply is
            no gap to hide.
          */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {chartVisit.inputs && (
              <div className={`${a.chartCard} h-[330px] ${valuesSpan}`}>
                <OutOfRange values={chartVisit.inputs} />
              </div>
            )}

            {chartVisit.stageDistribution && (
              <div className={`${a.chartCard} h-[330px] ${modelSpan}`}>
                <StageDistribution
                  distribution={chartVisit.stageDistribution}
                  predicted={chartVisit.stage ?? 0}
                />
              </div>
            )}

            {chartVisit.gateProbabilitySick !== null && (
              <div className={`${a.chartCard} h-[330px] ${modelSpan}`}>
                <TriageDonut
                  gate={{
                    probabilitySick: chartVisit.gateProbabilitySick,
                    healthy: chartVisit.gateHealthy ?? false,
                    // Falls back to the sick probability, which is what the
                    // gate's confidence IS whenever it did not answer
                    // healthy — never a literal, never invented.
                    confidencePct: chartVisit.gateConfidencePct ?? chartVisit.gateProbabilitySick,
                  }}
                />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
