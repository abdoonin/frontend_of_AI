/**
 * The fibrosis stage vocabulary, in ONE place.
 *
 * Ali's wording, given verbatim on 2026-08-10 and extended with the METAVIR
 * mapping. The backend's `_get_stage_description` produces the same strings;
 * this exists because most screens have only the stage NUMBER to hand — the
 * patients table, the profile card and the visit sheet all read `Visit.stage`,
 * which carries no description.
 *
 * Deliberate exception to LESSONS.md L-026: "Fibrosis" and "Cirrhosis" are
 * textbook terms the plain-English rule would normally translate, and they are
 * here on Ali's explicit instruction. Do not "fix" them in a later pass.
 *
 * THE PARENTHETICAL IS THE USEFUL HALF. These three grades are a RE-PARTITION
 * of METAVIR, not its first three points — Stage 2 is F2 and F3 merged, and
 * Stage 3 is F4 alone. Anyone who knows the F-scale, which is every
 * hepatologist, would otherwise read Stage 3 as F3 and take cirrhosis for one
 * grade milder than it is.
 */

/** Without the leading "Stage N:", for use as a sub-line beside the number. */
export const STAGE_LABEL: Record<number, string> = {
  1: 'Early Stage / Mild Fibrosis (F1)',
  2: 'Intermediate Stage (F2, F3)',
  3: 'Advanced Stage / Liver Cirrhosis (F4)',
}

/** The full line, matching the backend's `stage_description` exactly. */
export function stageDescription(stage: number): string {
  const label = STAGE_LABEL[stage]
  return label ? `Stage ${stage}: ${label}` : `Stage ${stage}`
}

/** Shared severity tone, so one patient never reads urgent on one screen and routine on another. */
export function stageTone(stage: number): 'critical' | 'caution' | 'normal' {
  return stage >= 3 ? 'critical' : stage >= 2 ? 'caution' : 'normal'
}
