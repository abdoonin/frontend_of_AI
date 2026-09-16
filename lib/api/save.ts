/**
 * Saving an assessment against a patient.
 *
 * Replaces the only working save path in the app — `ai-analysis-result.tsx`
 * :185-310, which the rebuilt assessment never had. Both of its "Save to
 * patient" buttons were rendered with no handler, so the new flow could run
 * every model and then write nothing. That mattered more than it looked:
 * decision D-13 is that the demo runs on REAL database history rather than a
 * seeded cohort, and a flow that cannot write produces no history at all.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE `confidence` / `risk_level` PROBLEM, AND WHAT THIS FILE DOES ABOUT IT
 *
 * `POST /reports` requires both columns (`SaveReportRequest`, main.py:111).
 * The backend is frozen, so they cannot be dropped. The old code filled them
 * with `confidence || 85` and `risk_level || 'medium'` (:262, :275) — two
 * frontend literals, and the reason every one of the 14 existing records holds
 * 85.0 or 95.0 and "medium". That column carries no information today (B-3).
 *
 * Ali's decision, 2026-08-09: write REAL derived values.
 *
 * - `confidence` carries the most severe genuine number the models produced.
 *   On the healthy path that is the gate's own `predict_proba` confidence,
 *   where the column name is actually correct. On the sick path it is the
 *   highest risk among the models that ran, which is a SEVERITY, not a
 *   confidence — the column name stays wrong because the schema is frozen.
 *   `advice` therefore states which number it is and which model produced it,
 *   so a row is self-explaining and nothing has to be taken on trust.
 *
 * - `risk_level` is derived from that severity in the correct direction. B-2
 *   has the backend computing `confidence >= 80 → "low"`, which labels a
 *   patient with 85% mortality risk low risk. Nothing here can produce that.
 *
 * §6.4 is unaffected: the redesigned UI still never RENDERS either column. It
 * reads `detailed_results`. This is about what gets written.
 */

import { INPUTS_KEY } from '@/lib/reports/detailed-results'
import type { GateResult } from './analyze'
import type { DetailedResults } from '@/lib/assessment/use-assessment'

// ─────────────────────────────────────────────────────────────────────────

export interface PatientDetails {
  name: string
  /** The hospital's own identifier. Unique — the backend rejects duplicates. */
  patientId: string
  birthDate: string
  email: string
  phone: string
}

export type SaveField = keyof PatientDetails

/**
 * A clinic issues the medical record number; a clinician does not invent one
 * at the point of saving. Typing it by hand also made a typo silently attach
 * an analysis to a DIFFERENT patient, because the backend matches on this
 * string and `createOrFindPatient` reuses whatever it finds.
 *
 * Format: HQ-YYMM-XXXX, the last four from a 36-character alphabet, so it is
 * short enough to read aloud and unique enough that a collision is rare. It is
 * not a security token and does not need to be unguessable.
 *
 * Collisions are still handled rather than assumed away: the caller regenerates
 * when the backend reports the identifier is taken (see `saveAssessment`).
 */
export function generatePatientId(now: Date = new Date()): string {
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no O/0/I/1 -- misread aloud
  let suffix = ''
  const random = new Uint32Array(4)
  crypto.getRandomValues(random)
  for (const n of random) suffix += alphabet[n % alphabet.length]
  return `HQ-${yy}${mm}-${suffix}`
}

/** Carries the offending field so the dialog can mark the right input. */
export class SaveError extends Error {
  constructor(
    message: string,
    readonly field?: SaveField,
  ) {
    super(message)
    this.name = 'SaveError'
  }
}

export interface AssessmentSummary {
  diagnosis: string
  advice: string
  /** See the header. A confidence on the healthy path, a severity otherwise. */
  confidence: number
  riskLevel: 'low' | 'medium' | 'high'
  /** Written verbatim in the shape every existing record and reader uses. */
  detailedResults: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────────────────
// Deriving what gets written
// ─────────────────────────────────────────────────────────────────────────

const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * Severity → risk level, in the direction a clinician would expect.
 *
 * Deliberately NOT the backend's rule (main.py:749-756), which reads the
 * confidence column and inverts: high number → "low" risk.
 */
function levelFor(severity: number): AssessmentSummary['riskLevel'] {
  if (severity >= 70) return 'high'
  if (severity >= 40) return 'medium'
  return 'low'
}

/**
 * The values that produced this analysis, stored alongside the results.
 *
 * `patients` has no gender column (B-4) and `lab_tests` is never written
 * (B-6), so until now everything a clinician typed was sent to the models and
 * discarded. That makes "gender distribution across patients" unbuildable and
 * leaves a visit detail showing a result with no sight of what produced it.
 *
 * Empty fields are dropped rather than stored as "": a key that is present but
 * blank reads as a value, and these become the only record of what was
 * entered.
 */
function inputsFor(values: Record<string, string>): Record<string, string> {
  const kept: Record<string, string> = {}
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') kept[key] = value
  }
  return kept
}

export function summarise(
  gate: GateResult,
  detailed: DetailedResults,
  rawResults: Record<string, unknown>,
  values: Record<string, string>,
): AssessmentSummary {
  const ran = detailed.cancer || detailed.fatty_liver || detailed.hepatitis
  const inputs = inputsFor(values)

  /*
    The healthy path stores the INPUTS but no model blocks, because no detailed
    model ran.

    It used to store `{}`, because `advanced-reports.tsx` and
    `medical-records.tsx` both decided "healthy" by testing whether the blob
    was empty. That test is now `hasModelResults()` in
    lib/reports/detailed-results.ts, which asks the real question — are there
    model results in here — so the blob is free to carry other things.

    Keeping the inputs matters most on this path: a healthy patient still has a
    gender and a full set of blood values, and excluding them would skew every
    distribution built from this data toward the sick.
  */
  if (gate.healthy && !ran) {
    return {
      diagnosis: 'No signs of liver disease',
      advice:
        `First check only, ${round1(gate.confidencePct)}% sure. ` +
        'Covers cancer risk, fatty liver and hepatitis C only; other liver disease is not ruled out.',
      confidence: round1(gate.confidencePct),
      riskLevel: 'low',
      detailedResults: { [INPUTS_KEY]: inputs },
    }
  }

  // Each candidate names itself, so the number written is traceable from the
  // saved row alone.
  const candidates: { severity: number; source: string }[] = []
  const findings: string[] = []

  if (detailed.hepatitis) {
    const h = detailed.hepatitis
    findings.push(`liver scarring Stage ${h.stage}`)
    candidates.push({
      severity: h.mortalityRisk,
      source: `${round1(h.mortalityRisk)}% mortality risk (hepatitis C survival check)`,
    })
  }

  if (detailed.fatty_liver) {
    const f = detailed.fatty_liver
    findings.push(f.hasFattyLiver ? 'fatty liver likely' : 'fatty liver unlikely')
    candidates.push({
      severity: f.sickProbability,
      source: `${round1(f.sickProbability)}% probability of fatty liver`,
    })
  }

  if (detailed.cancer) {
    const c = detailed.cancer
    findings.push(`cancer risk ${c.riskLevel.toLowerCase()}`)
    candidates.push({
      severity: c.riskPercentage,
      source: `${round1(c.riskPercentage)}% cancer risk from lifestyle and family history`,
    })
  }

  // The gate ran and flagged the patient, but no detailed model could — B-19,
  // and it is reachable. It must not be saved as a clean result.
  if (candidates.length === 0) {
    return {
      diagnosis: 'Something abnormal found, not explained by the three checks',
      advice:
        'The first check flagged this patient, but none of the detailed checks could run. ' +
        'Hepatitis B, alcohol-related and autoimmune liver disease are not covered. Further tests needed.',
      confidence: round1(gate.confidencePct),
      riskLevel: 'medium',
      detailedResults: { ...rawResults, [INPUTS_KEY]: inputs },
    }
  }

  const worst = candidates.reduce((a, b) => (b.severity > a.severity ? b : a))

  return {
    diagnosis: findings.join(', '),
    advice:
      `Most serious finding: ${worst.source}. ` +
      'Covers cancer risk, fatty liver and hepatitis C only; other liver disease is not ruled out.',
    confidence: round1(worst.severity),
    riskLevel: levelFor(worst.severity),
    detailedResults: { ...rawResults, [INPUTS_KEY]: inputs },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// The calls
// ─────────────────────────────────────────────────────────────────────────

async function detailOf(response: Response): Promise<string> {
  return response
    .json()
    .then((b) => b?.detail || b?.error || '')
    .catch(() => '')
}

/**
 * Create the patient, or reuse the existing record with the same identifier.
 *
 * The old implementation's reuse path was dead twice over: it matched on
 * `errorData.error` where the proxy relays FastAPI's `detail`, and it looked
 * for "ID already exists" where main.py:667 raises "ID is Currently used". So
 * re-saving under an identifier already in the database simply failed.
 */
async function createOrFindPatient(
  patient: PatientDetails,
  /**
   * How to react when the identifier is already taken.
   *
   * 'reuse' is right when a human typed a known MRN -- they mean that patient,
   * and the analysis becomes a second visit.
   *
   * 'regenerate' is the only safe answer for a GENERATED id. Reusing there
   * would file this analysis against a stranger who happens to hold the same
   * random string, which is the worst possible failure on a medical record.
   */
  onDuplicate: 'reuse' | 'regenerate' = 'reuse',
): Promise<number> {
  let response: Response
  try {
    response = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        name: patient.name,
        patient_id: patient.patientId,
        birth_date: patient.birthDate || null,
        email: patient.email || null,
        phone: patient.phone || null,
      }),
    })
  } catch {
    throw new SaveError("Couldn't reach the server")
  }

  if (response.ok) {
    const body = await response.json()
    const id = body?.patient?.id
    if (typeof id !== 'number') throw new SaveError('The server did not return a patient record')
    return id
  }

  const detail = await detailOf(response)

  if (response.status === 403) {
    throw new SaveError('You do not have permission to create patients')
  }

  if (response.status === 400 && /currently used|already exists/i.test(detail) && onDuplicate === 'regenerate') {
    // A fresh identifier, then try again. Bounded, so a backend that rejects
    // every id cannot spin here.
    for (let attempt = 0; attempt < 3; attempt++) {
      const retry = { ...patient, patientId: generatePatientId() }
      try {
        return await createOrFindPatient(retry, 'reuse')
      } catch {
        /* try another */
      }
    }
    throw new SaveError('Could not allocate a patient ID, try again', 'patientId')
  }

  // Duplicate identifier — reuse the existing record rather than failing.
  if (response.status === 400 && /currently used|already exists/i.test(detail)) {
    const existing = await fetch(
      `/api/patients?patient_id=${encodeURIComponent(patient.patientId)}`,
      { credentials: 'same-origin' },
    )
    if (existing.ok) {
      const body = await existing.json()
      const id = body?.patients?.[0]?.id
      if (typeof id === 'number') return id
    }
    // Patients are scoped to the creating doctor, so an identifier taken by a
    // colleague is invisible to this lookup. Say so rather than "not found".
    throw new SaveError(
      'That patient ID is already in use and is not in your patient list',
      'patientId',
    )
  }

  throw new SaveError(detail || `Could not save the patient (${response.status})`)
}

/**
 * File this analysis against a patient who already exists.
 *
 * This is what makes visit history real: `medical_reports` is one row per
 * analysis, so a second save against the same patient IS a second visit. Until
 * now the only route to that was a clinician retyping the same identifier.
 */
export async function saveToExistingPatient(
  patientDbId: number,
  summary: AssessmentSummary,
): Promise<{ patientId: number; reportId: number }> {
  return postReport(patientDbId, summary)
}

export async function saveAssessment(
  patient: PatientDetails,
  summary: AssessmentSummary,
  onDuplicate: 'reuse' | 'regenerate' = 'reuse',
): Promise<{ patientId: number; reportId: number }> {
  const patientId = await createOrFindPatient(patient, onDuplicate)
  return postReport(patientId, summary)
}

async function postReport(
  patientId: number,
  summary: AssessmentSummary,
): Promise<{ patientId: number; reportId: number }> {
  let response: Response
  try {
    response = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        patient_id: patientId,
        diagnosis: summary.diagnosis,
        confidence: summary.confidence,
        advice: summary.advice,
        risk_level: summary.riskLevel,
        detailed_results: summary.detailedResults,
      }),
    })
  } catch {
    throw new SaveError("Couldn't reach the server")
  }

  if (!response.ok) {
    throw new SaveError(
      (await detailOf(response)) || `Could not save the analysis (${response.status})`,
    )
  }

  const body = await response.json()
  return { patientId, reportId: body?.report_id }
}

// ─────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────

/**
 * Name and identifier are the backend's only requirements (main.py:659).
 * Everything else is optional here too.
 *
 * The old dialog rejected any email that was not `@gmail.com` (B-16), which
 * makes a hospital address unenterable. That was frontend-only validation with
 * no backend counterpart, so it is simply gone.
 */
export function validate(patient: PatientDetails): Partial<Record<SaveField, string>> {
  const errors: Partial<Record<SaveField, string>> = {}

  if (!patient.name.trim()) errors.name = 'Enter the patient’s name'
  // The identifier is generated, so an empty one means generation failed
  // rather than a clinician forgetting to type something.
  if (!patient.patientId.trim()) errors.patientId = 'No patient ID was generated'

  if (patient.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(patient.email.trim())) {
    errors.email = 'Enter a valid email address'
  }

  if (patient.birthDate) {
    const date = new Date(patient.birthDate)
    if (Number.isNaN(date.getTime()) || date > new Date()) {
      errors.birthDate = 'Enter a date of birth in the past'
    }
  }

  return errors
}
