/**
 * The one way to call /api/analyze.
 *
 * Replaces four `fetch` calls and three near-identical handlers in
 * `ai-radiology-scan.tsx` (:388, :496, :609, and one inlined in JSX at :1651),
 * plus a fifth in `hepatitis-input.tsx`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE WIRE CONTRACT, MEASURED against the real engine on 2026-08-09. None of
 * this is documented anywhere else, and two parts of it are counter-intuitive:
 *
 * 1. THE GATE NEEDS DIFFERENT KEY NAMES. `_validate_user_profile` checks
 *    `GATE_KEYS` (diagnosis_engine.py:41), which holds `total_bilirubin`,
 *    `alkaline_phosphotase`, `total_protiens` (the backend's own misspelling)
 *    and `albumin_and_globulin_ratio`. Sending the short names fails with
 *    "Missing required keys". `_extract_features` later accepts either name,
 *    which is what makes this look optional. It is not.
 *
 * 2. `mode` MUST TRAVEL FLAT, in the same object the engine validates.
 *    `main.py:135` unwraps `user_profile` when present, so a nested payload
 *    hands the engine an object with no `mode` — validation falls through to
 *    'full' and demands all 28 keys. Verified: nested gate fails.
 *
 * Consequently every mode here sends a FLAT payload, which also settles B-9:
 * hepatitis was the only caller nesting under `user_profile`, and flat was
 * verified working against the real models.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CLAUDE.md §6.4 IS ENFORCED BY THE TYPES.
 *
 * The response carries top-level `confidence` and `risk_level`. Both are
 * meaningless: `confidence` means a different thing per model and is twice a
 * RISK (hepatitis → mortality risk), and `risk_level` is derived from it and
 * inverted. Across all 14 records in the live database `confidence` only ever
 * holds 85.0 or 95.0 — both fallback literals.
 *
 * They are dropped here and never reach a caller. A screen cannot render what
 * the client does not return. Read the per-model fields instead; they are
 * correct and correctly named.
 */

import { GATE_KEYS, CANCER_KEYS, FATTY_KEYS, HEPATITIS_KEYS } from '@/lib/assessment/models'

// ─────────────────────────────────────────────────────────────────────────
// Results — one shape per model, named for what each number MEANS
// ─────────────────────────────────────────────────────────────────────────

export interface GateResult {
  /** Read this. Never recompute it from reference ranges — the model's
   *  boundary is learned and does not track them (LESSONS.md L-024). */
  healthy: boolean
  /** 0 = not healthy, 1 = healthy. */
  prediction: number
  featuresUsed: string[]
  diagnosis: string
  advice: string
  /**
   * A REAL confidence, added to the backend 2026-08-09 (the authorised
   * exception). Previously the UI showed a hardcoded 80 or 95 as if it were
   * model output. This is `predict_proba` for the class actually predicted.
   */
  confidencePct: number
  /** Both sides, so a screen can show how close the call was. */
  probabilitySick: number
  probabilityHealthy: number
}

export interface CancerResult {
  /** A RISK-FACTOR score, not a detection. This model sees no lab value at
   *  all — label it as such wherever it is shown (B-17). */
  riskPercentage: number
  /** Very Low | Stable | Early Warning | High Risk | (5th tier) */
  riskLevel: string
  advice: string
  featuresUsed: string[]
}

export interface FattyLiverResult {
  /** Arrives as e.g. 99.9000015258789 — float32 widened to float64 defeats
   *  the backend's round() (B-13). Round at the display layer, not here. */
  sickProbability: number
  hasFattyLiver: boolean
  diagnosis: string
  advice: string
  featuresUsed: string[]
}

export interface HepatitisResult {
  /** Fibrosis stage, 0–4. */
  stage: number
  stageDescription: string
  /**
   * Probability across every stage, e.g. { 'Stage 1': 14.0, 'Stage 2': 21.9, 'Stage 3': 64.1 }.
   * Keys come from the model's own classes_, so they follow a model swap.
   * Only the argmax used to be returned. "Stage 3 with 22% weight on Stage 2"
   * changes management, and a bare number hides it.
   */
  stageDistribution: Record<string, number>
  stageConfidencePct: number
  /** NEVER label this "confidence" — it is a mortality risk. */
  mortalityRisk: number
  complicationsRisk: number
  /** Established clinical formulas, not model output. A referee can check
   *  these by hand, which is exactly why they are worth showing. */
  apriScore: number
  albiScore: number
  /** The hepatitis model's OWN risk level, from detailed_results — not the
   *  derived top-level field §6.4 forbids. */
  riskLevel: string
  advice: string
  stageAdvice: string
  complicationsAdvice: string
  statusAdvice: string
}

export type AnalyzeMode = 'gate' | 'cancer' | 'fatty_liver' | 'hepatitis'

/**
 * `raw` is the response's `results` subtree, verbatim — `{ gate: {...} }`,
 * `{ cancer: {...} }` and so on.
 *
 * It exists for ONE purpose: `detailed_results` is written back to the
 * database as a JSON blob, and every existing record plus every existing
 * reader (`advanced-reports.tsx:3453`, `medical-records.tsx:306`) expects that
 * exact snake_case shape. Re-serialising from the typed results would produce
 * a second, incompatible shape and split the history in two.
 *
 * It is NOT an escape hatch from §6.4. The envelope's `confidence` and
 * `risk_level` live one level above `results` and are still dropped — what is
 * carried here is only the per-model subtree §6.4 tells us to read from.
 * Persistence only; never render from it.
 */
export type AnalyzeResult =
  | { mode: 'gate'; result: GateResult; raw: Record<string, unknown> }
  | { mode: 'cancer'; result: CancerResult; raw: Record<string, unknown> }
  | { mode: 'fatty_liver'; result: FattyLiverResult; raw: Record<string, unknown> }
  | { mode: 'hepatitis'; result: HepatitisResult; raw: Record<string, unknown> }

export class AnalyzeError extends Error {
  constructor(
    message: string,
    readonly mode: AnalyzeMode,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'AnalyzeError'
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Payload construction
// ─────────────────────────────────────────────────────────────────────────

/**
 * Gate-only renaming. The backend validates against these names and nothing
 * else. `total_protiens` is spelled the way `diagnosis_engine.py` spells it —
 * correcting it breaks the call.
 */
const GATE_WIRE_NAME: Record<string, string> = {
  bilirubin: 'total_bilirubin',
  bilirubin_direct: 'direct_bilirubin',
  alp: 'alkaline_phosphotase',
  alt: 'alamine_aminotransferase',
  ast: 'aspartate_aminotransferase',
  total_proteins: 'total_protiens',
  ag_ratio: 'albumin_and_globulin_ratio',
}

const MODE_KEYS: Record<AnalyzeMode, readonly string[]> = {
  gate: GATE_KEYS,
  cancer: CANCER_KEYS,
  fatty_liver: FATTY_KEYS,
  hepatitis: HEPATITIS_KEYS,
}

/** Fields the models read as text, not numbers. Everything else is coerced. */
const CATEGORICAL = new Set([
  'gender', 'smoking', 'alcohol', 'activity', 'genetic_risk', 'cancer_history',
  'ascites', 'hepatomegaly', 'spiders', 'edema',
])

export function buildPayload(
  mode: AnalyzeMode,
  values: Record<string, string>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = { mode }

  for (const key of MODE_KEYS[mode]) {
    const raw = values[key]
    if (raw === undefined || raw === '') {
      throw new AnalyzeError(`Missing required value: ${key}`, mode)
    }
    const wireKey = mode === 'gate' ? (GATE_WIRE_NAME[key] ?? key) : key
    payload[wireKey] = CATEGORICAL.has(key) ? raw : Number(raw)
  }

  return payload
}

// ─────────────────────────────────────────────────────────────────────────
// Parsing — this is where §6.4 is enforced
// ─────────────────────────────────────────────────────────────────────────

const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0))
const str = (v: unknown): string => (typeof v === 'string' ? v : '')

function parse(mode: AnalyzeMode, body: any): AnalyzeResult {
  // Both response shapes put the per-model payload under `results`: the gate
  // via `detailed_results`, the other three via `analysis_type`/`results`.
  // main.py normalises them into one envelope before returning (:252).
  const results = body?.results ?? {}

  switch (mode) {
    case 'gate': {
      const g = results.gate ?? {}
      return {
        mode,
        raw: results,
        result: {
          healthy: Boolean(g.is_healthy),
          prediction: num(g.prediction),
          featuresUsed: Array.isArray(g.features_used) ? g.features_used : [],
          diagnosis: str(body?.diagnosis),
          advice: str(body?.advice),
          confidencePct: num(g.confidence_pct),
          probabilitySick: num(g.probability_sick),
          probabilityHealthy: num(g.probability_healthy),
        },
      }
    }
    case 'cancer': {
      const c = results.cancer ?? {}
      return {
        mode,
        raw: results,
        result: {
          riskPercentage: num(c.risk_percentage),
          riskLevel: str(c.risk_level),
          advice: str(c.advice),
          featuresUsed: Array.isArray(c.features_used) ? c.features_used : [],
        },
      }
    }
    case 'fatty_liver': {
      const f = results.fatty_liver ?? {}
      return {
        mode,
        raw: results,
        result: {
          sickProbability: num(f.sick_probability),
          hasFattyLiver: Boolean(f.has_fatty_liver),
          diagnosis: str(f.diagnosis),
          advice: str(f.advice),
          featuresUsed: Array.isArray(f.features_used) ? f.features_used : [],
        },
      }
    }
    case 'hepatitis': {
      const h = results.hepatitis ?? {}
      return {
        mode,
        raw: results,
        result: {
          stage: num(h.stage),
          stageDescription: str(h.stage_description),
          stageDistribution: (h.stage_distribution ?? {}) as Record<string, number>,
          stageConfidencePct: num(h.stage_confidence_pct),
          mortalityRisk: num(h.mortality_risk),
          complicationsRisk: num(h.complications_risk),
          apriScore: num(h.apri_score),
          albiScore: num(h.albi_score),
          riskLevel: str(h.risk_level),
          advice: str(h.advice),
          stageAdvice: str(h.stage_advice),
          complicationsAdvice: str(h.complications_advice),
          statusAdvice: str(h.status_advice),
        },
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// The call
// ─────────────────────────────────────────────────────────────────────────

/**
 * Run one model. Goes browser → Next proxy → FastAPI; never direct, because
 * the backend's CORS allowlist is hardcoded to localhost (D-11).
 */
export async function analyze(
  mode: AnalyzeMode,
  values: Record<string, string>,
  signal?: AbortSignal,
): Promise<AnalyzeResult> {
  const payload = buildPayload(mode, values)

  let response: Response
  try {
    response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
      signal,
    })
  } catch (cause) {
    throw new AnalyzeError("Couldn't reach the server.", mode)
  }

  if (!response.ok) {
    const detail = await response
      .json()
      .then((b) => b?.error || b?.detail)
      .catch(() => null)
    throw new AnalyzeError(detail || `Analysis failed (${response.status})`, mode, response.status)
  }

  return parse(mode, await response.json())
}

/**
 * Run the three detailed models together.
 *
 * A model is called only when every one of its inputs is present — availability
 * is decided here, on the frontend, from the key sets. Never called means never
 * run on partial data. One model failing does not take the others down.
 */
export async function analyzeDetailed(
  values: Record<string, string>,
  signal?: AbortSignal,
): Promise<{ results: AnalyzeResult[]; skipped: AnalyzeMode[]; failed: AnalyzeError[] }> {
  const runnable: AnalyzeMode[] = []
  const skipped: AnalyzeMode[] = []

  for (const mode of ['cancer', 'fatty_liver', 'hepatitis'] as const) {
    const complete = MODE_KEYS[mode].every((k) => values[k] !== undefined && values[k] !== '')
    ;(complete ? runnable : skipped).push(mode)
  }

  const settled = await Promise.allSettled(
    runnable.map((mode) => analyze(mode, values, signal)),
  )

  const results: AnalyzeResult[] = []
  const failed: AnalyzeError[] = []
  settled.forEach((outcome, i) => {
    if (outcome.status === 'fulfilled') results.push(outcome.value)
    else {
      const reason = outcome.reason
      failed.push(
        reason instanceof AnalyzeError
          ? reason
          : new AnalyzeError(String(reason?.message ?? reason), runnable[i]),
      )
    }
  })

  return { results, skipped, failed }
}
