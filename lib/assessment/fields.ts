/**
 * The single declaration of every value the assessment collects.
 *
 * Extracted from `components/ai-radiology-scan.tsx`, where the same 30 fields
 * were declared three times over: `manualValues` held the keys, `fieldNames`
 * held the labels, and `fieldMetadata` held units and ranges — while the
 * markup re-stated all of it per field, at roughly 13 lines each.
 *
 * Keys are the wire names the backend expects. `diagnosis_engine.py` remaps a
 * few of them internally (`bilirubin` → `total_bilirubin`, `alp` →
 * `alkaline_phosphotase`, and so on, at :286-292), so these must not be
 * renamed to read better — they are the API contract.
 */

export type FieldGroup = 'patient' | 'lifestyle' | 'labs' | 'signs'

/**
 * A reference range. Either bound may be absent: cholesterol is "below 200"
 * and HDL is "40 or above", neither of which has two sides.
 */
export interface ReferenceRange {
  low?: number
  high?: number
}

export interface FieldDef {
  key: string
  /** Sentence case, plain English — matches the approved specimen copy. */
  label: string
  unit?: string
  range?: ReferenceRange
  /** Free-text ranges rendered as-is where a numeric one would mislead. */
  rangeNote?: string
  type: 'number' | 'select'
  options?: string[]
  group: FieldGroup
}

const YES_NO = ['No', 'Yes']

export const FIELDS: FieldDef[] = [
  // ── Patient ──
  { key: 'age',    label: 'Age',    unit: 'years', range: { low: 1, high: 120 }, type: 'number', group: 'patient' },
  { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'], group: 'patient' },

  // ── Lifestyle & history — the cancer model's entire input ──
  { key: 'bmi',            label: 'BMI',                             unit: 'kg/m²', range: { low: 18.5, high: 24.9 }, type: 'number', group: 'lifestyle' },
  { key: 'smoking',        label: 'Smoking',                         type: 'select', options: YES_NO, group: 'lifestyle' },
  { key: 'alcohol',        label: 'Alcohol',                         type: 'select', options: ['None', 'Low', 'Moderate', 'High'], group: 'lifestyle' },
  { key: 'activity',       label: 'Physical activity',               type: 'select', options: ['Low', 'Moderate', 'High'], group: 'lifestyle' },
  { key: 'genetic_risk',   label: 'Family history of liver disease', type: 'select', options: ['Low', 'Medium', 'High'], group: 'lifestyle' },
  { key: 'cancer_history', label: 'Previous cancer',                 type: 'select', options: YES_NO, group: 'lifestyle' },

  // ── Laboratory values ──
  { key: 'bilirubin',        label: 'Total bilirubin',     unit: 'mg/dL', range: { low: 0.3, high: 1.2 },  type: 'number', group: 'labs' },
  { key: 'bilirubin_direct', label: 'Direct bilirubin',    unit: 'mg/dL', range: { low: 0,   high: 0.3 },  type: 'number', group: 'labs' },
  { key: 'alp',              label: 'ALP',                 unit: 'IU/L',  range: { low: 44,  high: 147 },  type: 'number', group: 'labs' },
  { key: 'alt',              label: 'ALT',                 unit: 'IU/L',  range: { low: 7,   high: 56 },   type: 'number', group: 'labs' },
  { key: 'ast',              label: 'AST',                 unit: 'IU/L',  range: { low: 10,  high: 40 },   type: 'number', group: 'labs' },
  { key: 'total_proteins',   label: 'Total proteins',      unit: 'g/dL',  range: { low: 6,   high: 8.5 },  type: 'number', group: 'labs' },
  { key: 'albumin',          label: 'Albumin',             unit: 'g/dL',  range: { low: 3.5, high: 5 },    type: 'number', group: 'labs' },
  { key: 'ag_ratio',         label: 'Albumin / globulin',  range: { low: 1, high: 2.5 },                   type: 'number', group: 'labs' },
  { key: 'cholesterol',      label: 'Cholesterol',         unit: 'mg/dL', range: { high: 200 }, rangeNote: 'below 200', type: 'number', group: 'labs' },
  { key: 'triglycerides',    label: 'Triglycerides',       unit: 'mg/dL', range: { high: 150 }, rangeNote: 'below 150', type: 'number', group: 'labs' },
  { key: 'hdl',              label: 'HDL',                 unit: 'mg/dL', range: { low: 40 },   rangeNote: '40 or above', type: 'number', group: 'labs' },
  { key: 'glucose',          label: 'Glucose',             unit: 'mg/dL', range: { low: 70,  high: 100 },  type: 'number', group: 'labs' },
  { key: 'creatinine',       label: 'Creatinine',          unit: 'mg/dL', range: { low: 0.7, high: 1.3 },  type: 'number', group: 'labs' },
  { key: 'ggt',              label: 'GGT',                 unit: 'IU/L',  range: { low: 9,   high: 48 },   type: 'number', group: 'labs' },
  { key: 'uric_acid',        label: 'Uric acid',           unit: 'mg/dL', range: { low: 3.5, high: 7.2 },  type: 'number', group: 'labs' },
  { key: 'copper',           label: 'Copper',              unit: 'µg/dL', range: { low: 70,  high: 140 },  type: 'number', group: 'labs' },
  /**
   * Raw count per µL, NOT ×10³.
   *
   * `fieldMetadata` declared "×10³/µL, 150-450" while every preset sent
   * `280000`. Comparing 280000 against 150–450 marks a healthy platelet count
   * as catastrophically high. The scale kept here is the one the models are
   * actually fed, because changing what is sent would change model output.
   * See PROJECT_STATE.md B-20.
   */
  { key: 'platelets',   label: 'Platelets',       unit: '/µL', range: { low: 150000, high: 450000 }, type: 'number', group: 'labs' },
  { key: 'prothrombin', label: 'Prothrombin time', unit: 'sec', range: { low: 11, high: 13 },        type: 'number', group: 'labs' },

  // ── Physical signs ──
  /*
    Plain English, not the textbook term. "Ascites", "hepatomegaly", "spider
    naevi" and "edema" are the four labels on these screens that a
    non-specialist cannot read, and `ascites` is the single most visible input
    in the whole product — it is the top-weighted feature of the staging model,
    so it heads the importance chart on the results screen.

    The KEYS are untouched. They are the wire contract with the frozen backend
    and renaming one would break the call.
  */
  { key: 'ascites',      label: 'Fluid in the abdomen',   type: 'select', options: YES_NO, group: 'signs' },
  { key: 'hepatomegaly', label: 'Enlarged liver',         type: 'select', options: YES_NO, group: 'signs' },
  { key: 'spiders',      label: 'Spider-like skin veins', type: 'select', options: YES_NO, group: 'signs' },
  { key: 'edema',        label: 'Swelling in the legs',   type: 'select', options: ['None', 'Slight', 'Severe'], group: 'signs' },
]

export const FIELD_BY_KEY: Record<string, FieldDef> = Object.fromEntries(
  FIELDS.map((f) => [f.key, f]),
)

/** Every field key, in declaration order. */
export const FIELD_KEYS = FIELDS.map((f) => f.key)

/** An empty value set — replaces the hand-written `manualValues` initialiser. */
export function emptyValues(): Record<string, string> {
  return Object.fromEntries(FIELD_KEYS.map((k) => [k, '']))
}

export function fieldsIn(group: FieldGroup): FieldDef[] {
  return FIELDS.filter((f) => f.group === group)
}

export type RangeStatus = 'unknown' | 'normal' | 'low' | 'high'

/** Where a value sits against its reference range. */
export function rangeStatus(key: string, raw: string | undefined): RangeStatus {
  const field = FIELD_BY_KEY[key]
  if (!field?.range || raw === undefined || raw === '') return 'unknown'
  const n = Number(raw)
  if (!Number.isFinite(n)) return 'unknown'
  const { low, high } = field.range
  if (low !== undefined && n < low) return 'low'
  if (high !== undefined && n > high) return 'high'
  return 'normal'
}

/** Human-readable range, e.g. "0.3–1.2" or "below 200". Empty when there is none. */
export function rangeLabel(key: string): string {
  const field = FIELD_BY_KEY[key]
  if (!field?.range) return ''
  if (field.rangeNote) return field.rangeNote
  const { low, high } = field.range
  if (low !== undefined && high !== undefined) return `${low}–${high}`
  if (high !== undefined) return `below ${high}`
  if (low !== undefined) return `${low} or above`
  return ''
}

/**
 * Position of a value within its range, 0–1, for the readout marker.
 * Returns null when the field has no two-sided range to position against.
 */
export function rangePosition(key: string, raw: string | undefined): number | null {
  const field = FIELD_BY_KEY[key]
  const low = field?.range?.low
  const high = field?.range?.high
  if (low === undefined || high === undefined || high === low) return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return (n - low) / (high - low)
}
