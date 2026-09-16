/**
 * Patients and their visit history.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT THE BACKEND ACTUALLY OFFERS, measured 2026-08-09. Two surprises:
 *
 * 1. There is NO `GET /patients/{id}`. Only PUT (update), PUT /archive,
 *    PUT /restore and DELETE. A single patient is fetched by filtering the
 *    list: `GET /patients?patient_id=<string>`.
 *
 * 2. Both list endpoints filter on the patient_id STRING (the hospital's own
 *    identifier), not the numeric primary key. `GET /patient-analyses` looks
 *    the patient up by that string before filtering. So the profile route is
 *    keyed on the string too — using the numeric id would mean an extra
 *    round trip to translate it.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * `medical_reports` IS the visit table. One row per analysis, with
 * `patient_id`, `created_at` and the full `detailed_results`. No migration is
 * needed for visit history; it has simply never had a UI.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CLAUDE.md §6.4 IS ENFORCED BY THE TYPES, exactly as in `analyze.ts`.
 *
 * The response carries top-level `confidence` and `risk_level`. Across the 15
 * pre-existing records `confidence` holds only 85.0 or 95.0 — two frontend
 * fallbacks — and `risk_level` is derived from it in the wrong direction
 * (B-2). Records saved from 2026-08-09 carry a real severity there, which
 * makes the column MORE dangerous, not less: it now means two different things
 * depending on when the row was written.
 *
 * Neither field is returned by this module. The severity a screen shows is
 * read from `detailed_results`, which is correct for every row.
 */

import {
  hasModelResults,
  parseDetailedResults,
  readInputs,
} from '@/lib/reports/detailed-results'

// ─────────────────────────────────────────────────────────────────────────

export type PatientStatus = 'active' | 'archived'

export interface Patient {
  /** Primary key. Needed for archive/restore/update, which take the numeric id. */
  id: number
  /** The hospital's identifier, and what both list endpoints filter on. */
  patientId: string
  name: string
  email: string | null
  phone: string | null
  /** A VARCHAR with no validation (B-5). Live rows contain 2024-2026 dates,
   *  which is why age is read from the analysis inputs instead. */
  birthDate: string | null
  status: PatientStatus
  createdAt: string | null
  doctorName: string | null
}

/** One visit: a single analysis run against this patient. */
export interface Visit {
  id: number
  patientId: number
  createdAt: string | null
  diagnosis: string
  advice: string
  /** False for the healthy path, where the gate answered and no model ran. */
  hasResults: boolean
  /** The values that produced it, or null for records saved before
   *  2026-08-09 when inputs were not recorded. */
  inputs: Record<string, string> | null
  /** Fibrosis stage 0-4, when the hepatitis model ran. */
  stage: number | null
  cancerRiskPct: number | null
  fattyProbabilityPct: number | null
  mortalityRiskPct: number | null
  /**
   * Ascites risk from the complications model. Exposed so screens can say what
   * a percentage MEASURES instead of falling back on the one phrase they all
   * shared — see PROJECT_STATE.md 3d.
   */
  ascitesRiskPct: number | null
  /** AST-to-platelet ratio index. A named clinical score, checkable by hand. */
  apriScore: number | null
  /** Albumin-bilirubin score. Lower is better; -2.60 or below is grade 1. */
  albiScore: number | null
  /**
   * The staging model's own probability per stage, keyed 'Stage 1'..'Stage 3'.
   * Null unless that model ran. Feeds `StageDistribution` as stored.
   */
  stageDistribution: Record<string, number> | null
  /**
   * The gate's probability that the patient shows signs of disease, from its
   * `predict_proba` — never the top-level `confidence` column, which holds
   * only the fallback literals 85 and 95 (CLAUDE.md §6.4).
   */
  gateProbabilitySick: number | null
  /** The gate's own verdict. Null when no gate block was stored. */
  gateHealthy: boolean | null
  /** `predict_proba` for the class the gate actually predicted. */
  gateConfidencePct: number | null
}

export class PatientsError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'PatientsError'
  }
}

// ─────────────────────────────────────────────────────────────────────────

async function getJson(url: string): Promise<any> {
  let response: Response
  try {
    response = await fetch(url, { credentials: 'same-origin' })
  } catch {
    throw new PatientsError("Couldn't reach the server.")
  }
  if (!response.ok) {
    const detail = await response
      .json()
      .then((b) => b?.detail || b?.error)
      .catch(() => null)
    throw new PatientsError(detail || `Request failed (${response.status})`, response.status)
  }
  return response.json()
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const orNull = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null)

function toPatient(raw: any): Patient {
  return {
    id: Number(raw?.id),
    patientId: str(raw?.patient_id),
    name: str(raw?.name),
    email: orNull(raw?.email),
    phone: orNull(raw?.phone),
    birthDate: orNull(raw?.birth_date),
    status: raw?.status === 'archived' ? 'archived' : 'active',
    createdAt: orNull(raw?.created_at),
    doctorName: orNull(raw?.doctor_name),
  }
}

/** A number the backend may hand back as a float32 artefact (B-13). */
const pct = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 10) / 10 : null

function toVisit(raw: any): Visit {
  const blob = parseDetailedResults(raw?.detailed_results) as any
  const hepatitis = blob?.hepatitis
  const cancer = blob?.cancer
  const fatty = blob?.fatty_liver

  return {
    id: Number(raw?.id),
    patientId: Number(raw?.patient_id),
    createdAt: orNull(raw?.created_at),
    diagnosis: str(raw?.diagnosis),
    advice: str(raw?.advice),
    hasResults: hasModelResults(raw?.detailed_results),
    inputs: readInputs(raw?.detailed_results),
    stage: typeof hepatitis?.stage === 'number' ? hepatitis.stage : null,
    cancerRiskPct: pct(cancer?.risk_percentage),
    fattyProbabilityPct: pct(fatty?.sick_probability),
    mortalityRiskPct: pct(hepatitis?.mortality_risk),
    ascitesRiskPct: pct(hepatitis?.complications_risk),
    apriScore: typeof hepatitis?.apri_score === 'number' ? hepatitis.apri_score : null,
    albiScore: typeof hepatitis?.albi_score === 'number' ? hepatitis.albi_score : null,
    /*
      PASSED THROUGH SO THE PROFILE CAN REDRAW THE RESULT CHARTS.

      This mapper flattened a visit to the handful of numbers the table and the
      detail panel print, and dropped these two on the floor — which is why an
      analysis could be charted once, on the screen that produced it, and never
      again. Both are already in `detailed_results` on every row that reached
      the relevant model; nothing new is stored and no endpoint changes.

      `stage_distribution` is keyed 'Stage 1'..'Stage 3' (PROJECT_STATE.md 3b)
      and feeds `StageDistribution` unchanged. `probability_sick` is the gate's
      own number from `predict_proba`, not the hardcoded literal the top-level
      `confidence` column still holds.
    */
    stageDistribution:
      hepatitis?.stage_distribution && typeof hepatitis.stage_distribution === 'object'
        ? (hepatitis.stage_distribution as Record<string, number>)
        : null,
    gateProbabilitySick: pct(blob?.gate?.probability_sick),
    gateHealthy:
      typeof blob?.gate?.is_healthy === 'boolean' ? blob.gate.is_healthy : null,
    gateConfidencePct: pct(blob?.gate?.confidence_pct),
  }
}

// ─────────────────────────────────────────────────────────────────────────

export async function listPatients(status: 'active' | 'archived' | 'all' = 'active'): Promise<Patient[]> {
  const body = await getJson(`/api/patients?status=${status}`)
  const rows = Array.isArray(body?.patients) ? body.patients : []
  return rows.map(toPatient)
}

/** One patient, by the hospital identifier. See the header: there is no GET by id. */
export async function getPatient(patientId: string): Promise<Patient | null> {
  const body = await getJson(`/api/patients?patient_id=${encodeURIComponent(patientId)}`)
  const rows = Array.isArray(body?.patients) ? body.patients : []
  const match = rows.find((r: any) => str(r?.patient_id) === patientId) ?? rows[0]
  return match ? toPatient(match) : null
}

/**
 * Every visit for one patient, newest first — which is the order the backend
 * already returns them in.
 */
export async function listVisits(patientId: string): Promise<Visit[]> {
  const body = await getJson(
    `/api/patient-analyses?patient_id=${encodeURIComponent(patientId)}`,
  )
  const rows = Array.isArray(body?.analyses) ? body.analyses : []
  /*
    Newest first, defensively. `main.py` already orders by
    `desc(created_at)`, and everything downstream leans on it: the profile's
    "Last analysis" stat, the change-since-last-visit comparison, and the
    charts, which draw `visits[0]`. Sorting here costs nothing and means none
    of those silently show an old analysis if that ordering ever moves.
  */
  return rows
    .map(toVisit)
    .sort(
      (x: Visit, y: Visit) =>
        new Date(y.createdAt ?? 0).getTime() - new Date(x.createdAt ?? 0).getTime(),
    )
}

/** Every analysis the signed-in user may see. Used for per-patient counts. */
export async function listAllVisits(): Promise<Visit[]> {
  const body = await getJson('/api/patient-analyses')
  const rows = Array.isArray(body?.analyses) ? body.analyses : []
  return rows.map(toVisit)
}

async function mutate(url: string, method: string): Promise<void> {
  let response: Response
  try {
    response = await fetch(url, { method, credentials: 'same-origin' })
  } catch {
    throw new PatientsError("Couldn't reach the server.")
  }
  if (!response.ok) {
    const detail = await response
      .json()
      .then((b) => b?.detail || b?.error)
      .catch(() => null)
    throw new PatientsError(detail || `Request failed (${response.status})`, response.status)
  }
}

/** Archive and restore take the NUMERIC id, unlike the list filters. */
export const archivePatient = (id: number) => mutate(`/api/patients/${id}/archive`, 'PUT')
export const restorePatient = (id: number) => mutate(`/api/patients/${id}/restore`, 'PUT')

// ─────────────────────────────────────────────────────────────────────────

export interface PatientEdit {
  name: string
  patientId: string
  birthDate: string
  email: string
  phone: string
}

/** `PUT /patients/{id}` takes the numeric id and the same snake_case body as create. */
export async function updatePatient(id: number, edit: PatientEdit): Promise<void> {
  let response: Response
  try {
    response = await fetch(`/api/patients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        name: edit.name,
        patient_id: edit.patientId,
        birth_date: edit.birthDate || null,
        email: edit.email || null,
        phone: edit.phone || null,
      }),
    })
  } catch {
    throw new PatientsError("Couldn't reach the server.")
  }
  if (!response.ok) {
    const detail = await response.json().then((b) => b?.detail || b?.error).catch(() => null)
    throw new PatientsError(detail || `Could not save the patient (${response.status}).`)
  }
}

/**
 * PERMANENT. `main.py:637` deletes the patient AND cascades to every
 * medical_report they own — there is no undo and no soft-delete fallback.
 *
 * The backend refuses unless the patient is already archived ("Cannot delete
 * active patient. Archive first."), so the UI must only offer this on an
 * archived patient or the call is guaranteed to fail with a 400.
 */
export async function deletePatient(id: number): Promise<void> {
  return mutate(`/api/patients/${id}`, 'DELETE')
}
