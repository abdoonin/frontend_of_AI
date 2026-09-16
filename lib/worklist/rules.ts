/**
 * Which patients need looking at, derived from analyses that already exist.
 *
 * This replaces the Case Management tab, and the reason it is derived rather
 * than stored is not a design preference — there is no table to store it in.
 * Verified against the live database on 2026-08-10: the schema holds
 * `audit_logs`, `lab_tests`, `medical_reports`, `patients` and `users`, and
 * nothing else. No tasks, no appointments, no notes.
 *
 * WHAT WAS THERE BEFORE, so nobody rebuilds it by accident:
 *
 *   - Three invented patients (Ahmed Al-Rashid, Fatima Al-Zahra, Omar Hassan)
 *     were SEEDED INTO THE VISITOR'S OWN localStorage on first load and
 *     persisted, so they read as the judge's own clinic data.
 *   - Their content was from other specialties entirely: "Cycle 3 of
 *     chemotherapy" in "Chemo Suite A", "Cardiology Consultation",
 *     "Adjust insulin dosage based on recent glucose readings", and
 *     "Schedule follow-up MRI" in a system that does no imaging.
 *   - `treatmentProgress` was `confidence + Math.random() * 20 - 10`, which is
 *     why the bar moved on every refresh.
 *   - Case status branched on `confidence`, which only ever holds 85 or 95
 *     (PROJECT_STATE.md B-1), so two of its four states were unreachable and
 *     its "low confidence" alert could never fire.
 *
 * Everything below reads `detailed_results` through `lib/api/patients.ts`,
 * which by construction cannot return `confidence` or `risk_level`
 * (CLAUDE.md §6.4).
 */

import type { Patient, Visit } from '@/lib/api/patients'

/* ------------------------------------------------------------------ *
 * Thresholds
 * ------------------------------------------------------------------ */

/**
 * Stage 3 is where scarring is described as advanced and where surveillance
 * intervals shorten in practice. Matches the tone breaks already used on the
 * patient profile, so one patient does not read as urgent on one screen and
 * routine on another.
 */
export const ADVANCED_STAGE = 3

/** Months, expressed in days, before an advanced patient counts as overdue. */
export const OVERDUE_DAYS = 90

/** Mortality risk at or above this is carried as its own flag. */
export const HIGH_MORTALITY_PCT = 50

/**
 * Cancer risk at or above this earns its own flag.
 *
 * Measured across the cohort the scores are 3.6, 4.9, 7.9, 8.2, 83.7, 99.6,
 * 99.7, 99.9 — a genuine split, not a saturated column, so it can rank.
 */
export const HIGH_CANCER_PCT = 70

/** Fatty liver at or above this is worth naming as CONTEXT. See `contextLine`. */
export const FATTY_LIKELY_PCT = 50

/* ------------------------------------------------------------------ *
 * Shape
 * ------------------------------------------------------------------ */

export type FlagKind = 'rising' | 'high-mortality' | 'advanced-overdue' | 'cancer-risk'

export interface Flag {
  kind: FlagKind
  /** Short label for the badge. Plain English, no full stop (L-029). */
  label: string
  /**
   * The evidence behind the flag, as one string.
   *
   * Kept because it is what the CSV export writes and what the table's search
   * accessor indexes. It is DERIVED from the two halves below and is never
   * written by hand, so the sentence and its parts cannot drift apart.
   */
  detail: string
  /** The finding itself, carrying the numbers. */
  statement: string
  /**
   * The subordinate half — a gloss on a term, a caveat on what the model saw,
   * or the second fact that qualifies the first. `null` when the finding
   * stands on its own.
   *
   * IT IS SPLIT HERE, IN THE RULE, RATHER THAN IN THE VIEW. The follow-up
   * table sets the statement and the qualifier on separate lines, and an
   * earlier version of it did that by searching the sentence for an em-dash.
   * That is prose parsing in a component: it silently produced a lone
   * unqualified line for the one flag whose two halves were joined by a comma
   * instead, and Ali spotted it immediately — that line sat in a column where
   * every other statement had a second line beneath it, so it read as
   * disconnected from the rest.
   *
   * A sentence's own structure is the rule's knowledge, not the table's.
   */
  qualifier: string | null
  /** Higher sorts first. */
  weight: number
}

/**
 * Build a flag's evidence from its two halves.
 *
 * ONE JOINER, ` — `, FOR EVERY FLAG. Two of these were written with a comma
 * and read as comma splices — "Mortality risk up 25 points since the last
 * visit, scarring stage unchanged" joins two independent clauses. The dash is
 * both better English and the same mark the other three already used for the
 * identical job, so `detail` now reads consistently wherever it is exported.
 */
function evidence(
  statement: string,
  qualifier: string | null = null,
): Pick<Flag, 'detail' | 'statement' | 'qualifier'> {
  return {
    detail: qualifier ? `${statement} — ${qualifier}` : statement,
    statement,
    qualifier,
  }
}

export interface WorklistEntry {
  patient: Patient
  latest: Visit
  previous: Visit | null
  /** Whole days since the most recent analysis. */
  daysSince: number
  flags: Flag[]
  /** Sum of flag weights, for ranking. */
  score: number
  /**
   * What else the analysis found, when it is not already a flag.
   *
   * FLAG vs CONTEXT, and the distinction is the whole design. A flag is a
   * REASON to be on the list: it ranks, it filters, so it has to discriminate.
   * Fatty liver cannot — measured, it reads 99.9% for six of the eight
   * assessed patients, so a badge for it would fire on nearly every row and
   * dilute the badges that mean something.
   *
   * But Ali pushed back, correctly: a doctor looking at this patient should
   * still know they have fatty liver. That is useful whether or not it is why
   * they are here. So it appears as context — one muted line, secondary by
   * construction, never a badge.
   */
  context: string | null
}

/* ------------------------------------------------------------------ *
 * Rules
 * ------------------------------------------------------------------ */

function monthsWord(days: number): string {
  const months = Math.floor(days / 30)
  if (months < 1) return `${days} days`
  return months === 1 ? 'a month' : `${months} months`
}

/**
 * The three rules Ali selected on 2026-08-10.
 *
 * "Never reassessed" was offered and REJECTED: nearly every patient in the
 * database holds exactly one analysis, so it would have flagged almost the
 * whole list and told the reader nothing.
 */
function flagsFor(latest: Visit, previous: Visit | null, daysSince: number): Flag[] {
  const flags: Flag[] = []

  // 1. Getting worse between two analyses. Clinically the strongest signal,
  //    and the only one that needs a second visit to exist at all.
  if (previous) {
    if (latest.stage !== null && previous.stage !== null && latest.stage > previous.stage) {
      flags.push({
        kind: 'rising',
        label: 'Getting worse',
        ...evidence(`Scarring moved from Stage ${previous.stage} to Stage ${latest.stage}`),
        weight: 3,
      })
    } else if (
      latest.mortalityRiskPct !== null &&
      previous.mortalityRiskPct !== null &&
      latest.mortalityRiskPct > previous.mortalityRiskPct
    ) {
      const delta = Math.round((latest.mortalityRiskPct - previous.mortalityRiskPct) * 10) / 10
      /*
        "Risk rising", NOT "Getting worse" — deliberately a different word from
        the stage branch above.

        The patient profile's change card compares STAGE, so a patient who held
        at Stage 3 while their risk climbed reads "No change, still Stage 3"
        there. With
        one shared label this screen said "Getting worse" about the same
        patient, and the two screens looked like they disagreed. They do not:
        they are measuring different things, and the label now says which.
      */
      flags.push({
        kind: 'rising',
        label: 'Risk rising',
        // "points", not "%", because this is a change in a percentage rather
        // than a percentage of one — 71.6 to 96.6 is 25 points, not 25%.
        //
        // "scarring stage unchanged" is the QUALIFIER, and saying so is what
        // fixed the disconnected line: it is why this is a mortality-trend
        // flag and not a stage one, which is exactly the subordinate job the
        // other flags' glosses do.
        ...evidence(
          `Mortality risk up ${delta} points since the last visit`,
          'scarring stage unchanged',
        ),
        weight: 3,
      })
    }
  }

  // 2. High estimated risk to life. No "and no follow-up since" test is
  //    needed — this reads the LATEST analysis, so by definition nothing has
  //    come after it.
  if (latest.mortalityRiskPct !== null && latest.mortalityRiskPct >= HIGH_MORTALITY_PCT) {
    /*
      The BADGE names the action; the DETAIL names WHAT the number measures and
      the clinical picture it sits in.

      Every row on this screen is flagged by this one rule, so a detail that
      restated the rule gave six patients one sentence and six percentages —
      Ali twice, and PROJECT_STATE.md 3d. The fix is not to vary the wording for
      variety: it is to say which measure the percentage is, and pair it with
      the finding that actually distinguishes this patient.

      Medical vocabulary is deliberate and allowed here (Ali, 2026-08-10):
      "mortality risk", "cirrhosis" and "ascites" are what a doctor reads.
      MODEL vocabulary is still banned — no "status model", no "predict_proba",
      no class indices (L-026).

      Ascites is glossed once in the same line, because a judge reads this
      screen unattended too.
    */
    const m = latest.mortalityRiskPct
    const ascites = latest.ascitesRiskPct

    let found: ReturnType<typeof evidence>
    if (latest.stage !== null && latest.stage >= ADVANCED_STAGE) {
      found =
        ascites !== null && ascites >= 50
          ? evidence(
              `Mortality risk ${m}% with cirrhosis, and ${ascites}% risk of ascites`,
              'fluid building up in the abdomen',
            )
          : evidence(`Mortality risk ${m}% with cirrhosis`)
    } else if (latest.stage !== null) {
      // The striking one, and the current copy could not say it: structurally
      // early, functionally failing. The model documentation calls this the
      // acute-on-chronic picture.
      found = evidence(
        `Mortality risk ${m}% despite only Stage ${latest.stage} scarring`,
        'liver function failing',
      )
    } else {
      found = evidence(`Mortality risk ${m}% at the last analysis`)
    }

    flags.push({ kind: 'high-mortality', label: 'Needs urgent review', ...found, weight: 3 })
  }

  // 3. Cancer risk factors, as its own reason to be on the list.
  if (latest.cancerRiskPct !== null && latest.cancerRiskPct >= HIGH_CANCER_PCT) {
    /*
      B-17 governs every word here. This model reads NO liver chemistry — only
      age, sex, BMI, smoking, alcohol, activity, family history and previous
      cancer. So the number is a risk-FACTOR score, not a probability that the
      patient has cancer, and the copy has to say so or it is the most
      indefensible figure in the product.

      "risk factors", not "risk". The detail names what the score is built from
      and what it never saw.
    */
    flags.push({
      kind: 'cancer-risk',
      label: 'High cancer risk factors',
      ...evidence(
        `Cancer risk score ${latest.cancerRiskPct}%`,
        'from lifestyle and family history, with no imaging or biopsy',
      ),
      weight: 2,
    })
  }

  // 4. Advanced scarring with nothing recent.
  if (latest.stage !== null && latest.stage >= ADVANCED_STAGE && daysSince >= OVERDUE_DAYS) {
    flags.push({
      kind: 'advanced-overdue',
      label: 'Overdue',
      ...evidence(
        `Stage ${latest.stage} scarring`,
        `not analysed for ${monthsWord(daysSince)}`,
      ),
      weight: 2,
    })
  }

  return flags
}

/**
 * What else this analysis found, beyond the reasons the patient is listed.
 *
 * Only says things NOT already covered by a flag, so nothing is stated twice,
 * and only things worth a doctor's attention — a fatty liver probability of 4%
 * is not a finding.
 */
function contextFor(latest: Visit, flags: Flag[]): string | null {
  const parts: string[] = []

  /*
    Each item keeps its number in PARENTHESES so the commas only ever separate
    items. Written first as "fatty liver likely, 99.9%, APRI 5, above the
    scarring threshold" it read as one run-on sentence — the commas were doing
    two different jobs at once.
  */
  if (latest.fattyProbabilityPct !== null && latest.fattyProbabilityPct >= FATTY_LIKELY_PCT) {
    parts.push(`fatty liver likely (${latest.fattyProbabilityPct}%)`)
  }

  // Only when it did NOT earn a flag, or the row would say it twice.
  const flagged = flags.some((f) => f.kind === 'cancer-risk')
  if (!flagged && latest.cancerRiskPct !== null && latest.cancerRiskPct >= 20) {
    parts.push(`cancer risk factors (${latest.cancerRiskPct}%)`)
  }

  /*
    APRI WAS HERE AND WAS REMOVED — Ali, 2026-08-10. Deliberate, not an
    oversight, so do not add it back on the grounds that the value is
    available.

    It is a lab-derived index, not a finding: "raised APRI (2.29)" tells a
    reader who already knows the formula something they can also read off the
    stage, and tells everyone else nothing. On this screen it was a third
    number competing with the two the row is actually about, in the one line
    that is supposed to be secondary by construction.

    It is still shown where a number of that kind belongs — the per-visit
    detail sheet (`components/patients/visit-history.tsx`), beside ALBI and
    the rest of the measured values.
  */

  return parts.length ? `Also found: ${parts.join(', ')}` : null
}

/* ------------------------------------------------------------------ *
 * Build
 * ------------------------------------------------------------------ */

export function daysBetween(iso: string | null, now: Date): number {
  if (!iso) return 0
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return 0
  return Math.max(0, Math.floor((now.getTime() - then) / 86_400_000))
}

/**
 * Join patients to their analyses and keep only those carrying a flag.
 *
 * `Visit.patientId` is the NUMERIC key while `Patient.patientId` is the
 * hospital string — they are different fields with confusingly similar names,
 * and the join is on `Patient.id`. Getting this backwards produces an empty
 * worklist rather than an error, which is why it is called out here.
 *
 * Archived patients are excluded: they are not under active care, so flagging
 * them for follow-up would be noise.
 */
export function buildWorklist(
  patients: Patient[],
  visits: Visit[],
  now: Date = new Date(),
): WorklistEntry[] {
  const byPatient = new Map<number, Visit[]>()
  for (const v of visits) {
    const list = byPatient.get(v.patientId)
    if (list) list.push(v)
    else byPatient.set(v.patientId, [v])
  }

  const entries: WorklistEntry[] = []

  for (const patient of patients) {
    if (patient.status === 'archived') continue

    const list = byPatient.get(patient.id)
    if (!list || list.length === 0) continue

    // Newest first. The backend already returns them this way, but this does
    // not depend on that holding.
    const sorted = [...list].sort(
      (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
    )

    const latest = sorted[0]
    const previous = sorted[1] ?? null
    const daysSince = daysBetween(latest.createdAt, now)
    const flags = flagsFor(latest, previous, daysSince)

    if (flags.length === 0) continue

    entries.push({
      patient,
      latest,
      previous,
      daysSince,
      flags,
      score: flags.reduce((sum, f) => sum + f.weight, 0),
      context: contextFor(latest, flags),
    })
  }

  // Most concerning first; among equals, the one waiting longest.
  return entries.sort((a, b) => b.score - a.score || b.daysSince - a.daysSince)
}

/** Counts per rule, for the summary line above the list. */
export function countByKind(entries: WorklistEntry[]): Record<FlagKind, number> {
  const counts: Record<FlagKind, number> = {
    'rising': 0,
    'high-mortality': 0,
    'advanced-overdue': 0,
    'cancer-risk': 0,
  }
  for (const e of entries) for (const f of e.flags) counts[f.kind]++
  return counts
}
