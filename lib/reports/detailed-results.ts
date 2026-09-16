/**
 * Reading the `detailed_results` blob.
 *
 * `medical_reports.detailed_results` is a JSON string in a relational column
 * (B-8). It is the only place per-analysis detail is stored, and the schema is
 * frozen, so it is also the only place new per-analysis detail CAN be stored.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TWO SHAPES EXIST IN THE LIVE DATABASE, and code must handle both.
 *
 *   old  { cancer: {...}, hepatitis: {...}, fatty_liver: {...} }   or  {}
 *   new  the same, plus `gate` and `inputs`
 *
 * Reports 1-14 are the old shape; 6 of them are `{}` because the healthy path
 * wrote nothing. Report 15 onwards carries the gate block, and everything
 * saved after 2026-08-09 carries `inputs` as well.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY `inputs` EXISTS, since it looks like duplication.
 *
 * `patients` has no gender column (B-4) and `lab_tests` has zero rows because
 * its write path is dead (B-6). So the values a clinician typed were sent to
 * the models and then discarded -- which makes "gender distribution across
 * patients" unbuildable, and a visit detail that shows a result but not the
 * values behind it.
 *
 * Storing them here is frontend-only: no migration, no backend change, and no
 * new column. It is the free-form blob doing the job it is already doing.
 */

/** The per-model result blocks, exactly as the backend names them. */
export const MODEL_KEYS = ['gate', 'cancer', 'fatty_liver', 'hepatitis'] as const

/** Where the analysis inputs live inside the blob. */
export const INPUTS_KEY = 'inputs'

export function parseDetailedResults(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    // A malformed blob is a record we cannot read, not a crash.
    return {}
  }
}

/**
 * Did any detailed model actually run?
 *
 * Replaces `Object.keys(parsed).length === 0`, which was how two live screens
 * decided a record was the healthy path. That test breaks the moment the blob
 * carries anything else -- `inputs` makes a healthy record non-empty, and those
 * screens would then render badges for models that never ran.
 *
 * Ask the real question instead: are there model results in here?
 */
export function hasModelResults(raw: string | null | undefined): boolean {
  const parsed = parseDetailedResults(raw)
  // `gate` alone is a routing decision, not a detailed result -- a record with
  // only a gate block is still the healthy path.
  return ['cancer', 'fatty_liver', 'hepatitis'].some((k) => {
    const block = parsed[k]
    return Boolean(block) && typeof block === 'object'
  })
}

/**
 * The values that produced this analysis, or null for records saved before
 * they were recorded. Null is the honest answer for the first 15 reports --
 * never an empty object, which would read as "no values entered".
 */
export function readInputs(raw: string | null | undefined): Record<string, string> | null {
  const parsed = parseDetailedResults(raw)
  const inputs = parsed[INPUTS_KEY]
  if (!inputs || typeof inputs !== 'object') return null
  return inputs as Record<string, string>
}
