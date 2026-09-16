/**
 * Every figure on the Reports screen, computed from data the app already has.
 *
 * NO NEW NETWORK CALLS. `listPatients` and `listAllVisits` each fetch once and
 * everything here is derived in memory — the same shape `/follow-up` uses, and
 * for the same reason: PROJECT_STATE.md problem 13, where one render of the old
 * Reports tab fired six identical `GET /patient-analyses`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT THE OLD REPORTS TAB CHARTED, so nobody rebuilds it by accident. It had
 * four charts hidden inside the Medical Tools tab, and all four were unusable:
 *
 *   Patient Age Distribution   read `birth_date`, which is B-5 — live values
 *                              are 2024-2026, so every patient computed to age
 *                              0 and the whole cohort landed in one bar.
 *   Confidence Distribution    bucketed the top-level `confidence`, which
 *                              CLAUDE.md §6.4 forbids rendering at all and
 *                              which only ever holds 85 or 95 — two bars, for
 *                              ever.
 *   Appointment Types          there is no appointments table. Invented.
 *   Case Status                branched on `confidence`, so two of its four
 *                              states were unreachable.
 *
 * Age is computed here from the stored analysis INPUTS instead, where the
 * number is the one the clinician typed in to run the model. That is the same
 * fix the patient profile uses for age and sex (B-4, B-5).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * FOUR PROPERTIES OF THE REAL DATA THAT SHAPE EVERY FUNCTION BELOW. All four
 * were measured against the live database on 2026-08-10, not assumed.
 *
 * 1. ONE PATIENT IN 26 HAS MORE THAN ONE ANALYSIS. Any cohort-wide trend or
 *    "improvement over time" is dead on arrival. Nothing here computes one.
 * 2. APRIL AND MAY 2026 HAVE ZERO ANALYSES. `monthlyVolume` emits empty months
 *    rather than skipping them — a gap in the record is a fact about the
 *    record, and a chart that closes it silently is lying about density.
 * 3. SEX AND AGE EXIST FOR ONLY 13 OF 28 ANALYSES. Inputs have been stored
 *    since 2026-08-09 only. Every partial figure therefore carries its own
 *    `of` denominator so the screen can say "13 of 28 recorded it" instead of
 *    implying the other 15 were something.
 * 4. ONE LEGACY RECORD CARRIES `stage: 0`, from the five-class model retired on
 *    2026-08-10 (§3b). The current scale starts at 1, so a naive groupBy would
 *    render a phantom "Stage 0" bucket. It is excluded and COUNTED, never
 *    silently dropped — `stageDistribution().legacyExcluded` is what the card
 *    footnote reads.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SCOPE: the backend filters patients by `doctor_id`, so every number here
 * describes the SIGNED-IN DOCTOR'S patients, not the clinic. Copy on the
 * screen must not imply otherwise — two judges on two accounts will see
 * different totals and one of them will think the app is broken.
 */

import type { Patient, Visit } from '@/lib/api/patients'

/* ------------------------------------------------------------------ *
 * Shapes
 * ------------------------------------------------------------------ */

/** A count that knows what it is a count OF. See property 3 above. */
export interface Share {
  count: number
  /** The population the count was taken from. Never assume it is the total. */
  of: number
  /** Whole percent, for display. 0 when `of` is 0. */
  pct: number
}

export interface Bucket {
  label: string
  count: number
}

export interface ReportMetrics {
  patients: { total: number; active: number; archived: number }
  analyses: { total: number; firstAt: string | null; lastAt: string | null; activeDays: number }
  /** The gate's verdict across every analysis. */
  firstCheck: { noSigns: Share; furtherAssessment: Share; staged: Share }
  stages: { buckets: Bucket[]; staged: number; legacyExcluded: number }
  findings: Bucket[]
  gender: { buckets: Bucket[]; recorded: Share }
  age: { buckets: Bucket[]; recorded: Share; min: number | null; max: number | null }
  mortality: { buckets: Bucket[]; measured: number }
  monthly: { label: string; iso: string; count: number }[]
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function share(count: number, of: number): Share {
  return { count, of, pct: of === 0 ? 0 : Math.round((count / of) * 100) }
}

/**
 * The current fibrosis scale is 1-3 (§3b). `0` means the row was written by
 * the retired five-class model and its integer means something else entirely —
 * the two scales are NOT compatible, so the value cannot be remapped, only
 * excluded.
 */
const LEGACY_STAGE = 0

/* ------------------------------------------------------------------ *
 * The metrics
 * ------------------------------------------------------------------ */

export function stageDistribution(visits: Visit[]): ReportMetrics['stages'] {
  const counts = new Map<number, number>()
  let legacyExcluded = 0

  for (const v of visits) {
    if (v.stage === null) continue
    if (v.stage === LEGACY_STAGE) {
      legacyExcluded++
      continue
    }
    counts.set(v.stage, (counts.get(v.stage) ?? 0) + 1)
  }

  /*
    Buckets come from the stages actually PRESENT, ascending — not from a
    hardcoded 1..3. `components/assessment/charts.tsx` learned this the hard
    way: hardcoding ['F0'..'F4'] is exactly what would have mislabelled every
    bar when the model was swapped. If a fourth stage ever appears it shows up
    here on its own.
  */
  const buckets = [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([stage, count]) => ({ label: `Stage ${stage}`, count }))

  return {
    buckets,
    staged: [...counts.values()].reduce((a, b) => a + b, 0),
    legacyExcluded,
  }
}

/**
 * Thresholds are the worklist's, deliberately.
 *
 * `lib/worklist/rules.ts` already decides what counts as a finding worth a
 * doctor's attention, and a Reports page that used different numbers would
 * report a different clinic than `/follow-up` does for the same data. Importing
 * the constants rather than restating them is what keeps the two screens from
 * drifting.
 */
import {
  ADVANCED_STAGE,
  FATTY_LIKELY_PCT,
  HIGH_CANCER_PCT,
  HIGH_MORTALITY_PCT,
} from '@/lib/worklist/rules'

/** Ascites has no worklist threshold of its own; 50% is the value the
 *  follow-up detail line already uses to decide whether to mention it. */
const ASCITES_PCT = 50

export function findingCounts(visits: Visit[]): Bucket[] {
  let fatty = 0
  let mortality = 0
  let cancer = 0
  let cirrhosis = 0
  let ascites = 0

  for (const v of visits) {
    if (v.fattyProbabilityPct !== null && v.fattyProbabilityPct >= FATTY_LIKELY_PCT) fatty++
    if (v.mortalityRiskPct !== null && v.mortalityRiskPct >= HIGH_MORTALITY_PCT) mortality++
    if (v.cancerRiskPct !== null && v.cancerRiskPct >= HIGH_CANCER_PCT) cancer++
    if (v.stage !== null && v.stage >= ADVANCED_STAGE) cirrhosis++
    if (v.ascitesRiskPct !== null && v.ascitesRiskPct >= ASCITES_PCT) ascites++
  }

  /*
    "High cancer risk factors", never "cancer". B-17: that model reads no liver
    chemistry at all — only age, sex, BMI, smoking, alcohol, activity, family
    history and previous cancer — so the number is a risk-FACTOR score, not a
    probability the patient has cancer. Same wording as the worklist badge.
  */
  return [
    { label: 'Fatty liver likely', count: fatty },
    { label: 'High mortality risk', count: mortality },
    { label: 'High cancer risk factors', count: cancer },
    { label: 'Cirrhosis, Stage 3', count: cirrhosis },
    { label: 'Raised ascites risk', count: ascites },
  ]
    .filter((b) => b.count > 0)
    .sort((a, b) => b.count - a.count)
}

export function genderSplit(visits: Visit[]): ReportMetrics['gender'] {
  const counts = new Map<string, number>()
  for (const v of visits) {
    const g = v.inputs?.gender
    if (!g) continue
    counts.set(g, (counts.get(g) ?? 0) + 1)
  }
  const recorded = [...counts.values()].reduce((a, b) => a + b, 0)
  return {
    buckets: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count })),
    recorded: share(recorded, visits.length),
  }
}

/** Bands chosen to match the ones the retired chart used, so the shape of the
 *  cohort stays comparable to anything already screenshotted. */
const AGE_BANDS: [string, number, number][] = [
  ['18–30', 0, 30],
  ['31–45', 31, 45],
  ['46–60', 46, 60],
  ['61–75', 61, 75],
  ['76+', 76, Infinity],
]

export function ageDistribution(visits: Visit[]): ReportMetrics['age'] {
  const counts = new Map(AGE_BANDS.map(([label]) => [label, 0]))
  let recorded = 0
  let min: number | null = null
  let max: number | null = null

  for (const v of visits) {
    const raw = v.inputs?.age
    if (raw === undefined) continue
    const age = Number(raw)
    if (!Number.isFinite(age) || age <= 0) continue
    recorded++
    min = min === null ? age : Math.min(min, age)
    max = max === null ? age : Math.max(max, age)
    const band = AGE_BANDS.find(([, lo, hi]) => age >= lo && age <= hi)
    if (band) counts.set(band[0], (counts.get(band[0]) ?? 0) + 1)
  }

  /*
    Empty bands are KEPT. A band that vanishes because nobody fell into it
    makes the axis change shape between two clinics, and a reader cannot tell
    "no patients here" from "we don't measure that".
  */
  return {
    buckets: AGE_BANDS.map(([label]) => ({ label, count: counts.get(label) ?? 0 })),
    recorded: share(recorded, visits.length),
    min,
    max,
  }
}

const MORTALITY_BANDS: [string, number, number][] = [
  ['Under 25%', 0, 24.999],
  ['25–49%', 25, 49.999],
  ['50–74%', 50, 74.999],
  ['75% and over', 75, Infinity],
]

export function mortalityBands(visits: Visit[]): ReportMetrics['mortality'] {
  const counts = new Map(MORTALITY_BANDS.map(([label]) => [label, 0]))
  let measured = 0
  for (const v of visits) {
    if (v.mortalityRiskPct === null) continue
    measured++
    const band = MORTALITY_BANDS.find(([, lo, hi]) => v.mortalityRiskPct! >= lo && v.mortalityRiskPct! <= hi)
    if (band) counts.set(band[0], (counts.get(band[0]) ?? 0) + 1)
  }
  return {
    buckets: MORTALITY_BANDS.map(([label]) => ({ label, count: counts.get(label) ?? 0 })),
    measured,
  }
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Analyses per calendar month, from the first record to the last.
 *
 * EMPTY MONTHS ARE EMITTED, not skipped — see property 2. April and May 2026
 * genuinely have none, and a chart that omitted them would compress six months
 * into four and misstate how busy the clinic is. A quiet month is information.
 */
export function monthlyVolume(visits: Visit[]): ReportMetrics['monthly'] {
  const dated = visits
    .map((v) => (v.createdAt ? new Date(v.createdAt) : null))
    .filter((d): d is Date => d !== null && Number.isFinite(d.getTime()))
  if (dated.length === 0) return []

  const counts = new Map<string, number>()
  for (const d of dated) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const first = new Date(Math.min(...dated.map((d) => d.getTime())))
  const last = new Date(Math.max(...dated.map((d) => d.getTime())))

  const out: ReportMetrics['monthly'] = []
  const cursor = new Date(first.getFullYear(), first.getMonth(), 1)
  const end = new Date(last.getFullYear(), last.getMonth(), 1)
  while (cursor <= end) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    out.push({ iso, label: MONTH_NAMES[cursor.getMonth()], count: counts.get(iso) ?? 0 })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return out
}

/** Distinct calendar days that carried at least one analysis. */
function activeDays(visits: Visit[]): number {
  const days = new Set<string>()
  for (const v of visits) {
    if (v.createdAt) days.add(v.createdAt.slice(0, 10))
  }
  return days.size
}

/* ------------------------------------------------------------------ *
 * Build
 * ------------------------------------------------------------------ */

export function buildMetrics(patients: Patient[], visits: Visit[]): ReportMetrics {
  const total = visits.length

  const noSigns = visits.filter((v) => !v.hasResults).length
  const staged = visits.filter((v) => v.stage !== null && v.stage !== LEGACY_STAGE).length

  const dates = visits.map((v) => v.createdAt).filter((d): d is string => !!d).sort()

  return {
    patients: {
      total: patients.length,
      active: patients.filter((p) => p.status === 'active').length,
      archived: patients.filter((p) => p.status === 'archived').length,
    },
    analyses: {
      total,
      firstAt: dates[0] ?? null,
      lastAt: dates[dates.length - 1] ?? null,
      activeDays: activeDays(visits),
    },
    firstCheck: {
      noSigns: share(noSigns, total),
      furtherAssessment: share(total - noSigns, total),
      // Of those sent on, how many actually reached the staging model. B-19:
      // the gate can flag a patient the detailed layer cannot explain, so this
      // is not the same number as `furtherAssessment`.
      staged: share(staged, total - noSigns),
    },
    stages: stageDistribution(visits),
    findings: findingCounts(visits),
    gender: genderSplit(visits),
    age: ageDistribution(visits),
    mortality: mortalityBands(visits),
    monthly: monthlyVolume(visits),
  }
}
