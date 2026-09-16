/**
 * Which values each model consumes, and which models can therefore run.
 *
 * These key sets mirror `backend/diagnosis_engine.py` (GATE_KEYS :41,
 * CANCER_KEYS :43, FATTY_KEYS :45, HEP_STAGE_KEYS :47). The backend is frozen;
 * this file must track it, never lead it.
 *
 * Availability is decided HERE, on the frontend. The backend raises when keys
 * are missing, so a model without its inputs is simply never called — no
 * backend change is involved. A model either has everything it needs or it
 * does not run. It never runs on partial inputs.
 */

import { FIELD_BY_KEY } from './fields'

export type ModelId = 'gate' | 'cancer' | 'fatty_liver' | 'hepatitis'

/**
 * The gate's ten, in the registry's own key names.
 *
 * CAREFUL: these are NOT the names the gate is called with. Validation checks
 * `GATE_KEYS` in diagnosis_engine.py:41, which uses `total_bilirubin`,
 * `alkaline_phosphotase`, `total_protiens` (sic) and
 * `albumin_and_globulin_ratio`. Sending the names below fails outright with
 * "Missing required keys" — verified. `lib/api/analyze.ts` owns that renaming;
 * an earlier comment here claimed the backend did it, which was wrong.
 *
 * `_extract_features` (:286) later accepts either spelling, which is what
 * makes the renaming look optional. It is not.
 */
export const GATE_KEYS = [
  'age', 'gender', 'bilirubin', 'bilirubin_direct', 'alp',
  'alt', 'ast', 'total_proteins', 'albumin', 'ag_ratio',
] as const

export const CANCER_KEYS = [
  'age', 'gender', 'bmi', 'smoking', 'genetic_risk', 'activity', 'alcohol', 'cancer_history',
] as const

export const FATTY_KEYS = [
  'albumin', 'alp', 'ast', 'alt', 'cholesterol', 'creatinine', 'glucose',
  'ggt', 'bilirubin', 'triglycerides', 'uric_acid', 'platelets', 'hdl',
] as const

/**
 * Hepatitis staging. The complications model drops `ascites` (14 features) and
 * the mortality model takes these 15 plus the predicted stage injected at
 * index 9 — all three run from one call, so this is the set the UI must
 * collect.
 */
export const HEPATITIS_KEYS = [
  'bilirubin', 'cholesterol', 'albumin', 'copper', 'alp', 'ast', 'triglycerides',
  'platelets', 'prothrombin', 'age', 'gender', 'ascites', 'hepatomegaly', 'spiders', 'edema',
] as const

export const MODEL_KEYS: Record<ModelId, readonly string[]> = {
  gate: GATE_KEYS,
  cancer: CANCER_KEYS,
  fatty_liver: FATTY_KEYS,
  hepatitis: HEPATITIS_KEYS,
}

/** The three that run after the gate routes a patient onward. */
export const DETAILED_MODELS: ModelId[] = ['cancer', 'fatty_liver', 'hepatitis']

export const MODEL_LABEL: Record<ModelId, string> = {
  gate: 'First check',
  cancer: 'Cancer risk',
  fatty_liver: 'Fatty liver',
  hepatitis: 'Hepatitis C',
}

/**
 * What kind of statement each model makes. These are NOT three comparable
 * diagnoses — the cancer model sees no laboratory value at all, so presenting
 * it beside a biochemical screen as an equivalent result is the credibility
 * problem recorded as B-17. Any screen showing these must label the kind.
 */
export const MODEL_KIND: Record<Exclude<ModelId, 'gate'>, string> = {
  cancer: 'Based on lifestyle and family history. Uses no blood tests or scans.',
  fatty_liver: 'Based on 13 blood test values.',
  hepatitis: 'Three models in sequence: scarring stage, then complication and mortality risk.',
}

function isFilled(values: Record<string, string>, key: string): boolean {
  const v = values[key]
  return v !== undefined && v.trim() !== ''
}

export interface Readiness {
  model: ModelId
  ready: boolean
  /** Keys still needed, in declaration order. */
  missing: string[]
  /** Labels for those keys, for display. */
  missingLabels: string[]
}

export function readiness(model: ModelId, values: Record<string, string>): Readiness {
  const missing = MODEL_KEYS[model].filter((k) => !isFilled(values, k))
  return {
    model,
    ready: missing.length === 0,
    missing: [...missing],
    missingLabels: missing.map((k) => FIELD_BY_KEY[k]?.label ?? k),
  }
}

/** Readiness for the three detailed models, in display order. */
export function detailedReadiness(values: Record<string, string>): Readiness[] {
  return DETAILED_MODELS.map((m) => readiness(m, values))
}

/**
 * Keys the detailed assessment still needs once the gate's ten are entered.
 *
 * The union is 20, not 23: fatty liver and hepatitis share cholesterol,
 * triglycerides and platelets.
 */
export function detailedKeys(): string[] {
  const gate = new Set<string>(GATE_KEYS)
  const seen = new Set<string>()
  const out: string[] = []
  for (const model of DETAILED_MODELS) {
    for (const k of MODEL_KEYS[model]) {
      if (!gate.has(k) && !seen.has(k)) {
        seen.add(k)
        out.push(k)
      }
    }
  }
  return out
}
