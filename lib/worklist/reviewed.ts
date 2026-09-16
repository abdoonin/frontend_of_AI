/**
 * Which follow-up flags this clinician has already looked at.
 *
 * THE KEY INCLUDES THE ANALYSIS ID, AND THAT IS THE WHOLE DESIGN. A flag is
 * acknowledged against the specific analysis that raised it, so the moment a
 * NEW analysis re-flags the same patient the key changes and they come back to
 * the top of the list. Marking someone reviewed today can never suppress
 * tomorrow's deterioration — which is the one way a feature like this could
 * do real harm.
 *
 * WHERE IT IS STORED, AND THE HONEST LIMITATION. In `localStorage`, because
 * the database has no column for it and CLAUDE.md §3 freezes the backend. So
 * it is per-browser and per-device: another doctor does not see it, and a
 * redeploy clears it.
 *
 * That is a real limitation but NOT the failure the old Case Management tab
 * had. That tab seeded three invented patients into the visitor's storage and
 * presented them as clinic data. This stores nothing but the current user's
 * own acknowledgements of real, model-derived flags — a view preference, not
 * fabricated content. Nothing here is ever rendered as clinical fact.
 */

const KEY = 'hepatiq.followup.reviewed'

/**
 * Patient, the analysis that raised the flag, and WHEN that analysis was run.
 *
 * `patientId` is the hospital string rather than the numeric key, so the entry
 * survives the row being refetched.
 *
 * THE TIMESTAMP IS NOT DECORATION. Without it the key is `patient:id`, and
 * SQLite reuses row ids after a delete — `medical_reports.id` is a plain
 * INTEGER PRIMARY KEY, so the next insert takes max+1 and a deleted 21 comes
 * back as 21. Caught live on 2026-08-10: re-seeding the demo cohort handed
 * Mustafa Al-Obeidi a brand-new analysis that inherited id 21, and an hour-old
 * "reviewed" mark silently hid a patient the rules had put at the TOP of the
 * list with a 96.6% estimated risk to life.
 *
 * Only a delete-and-reinsert can produce that, which does not happen in normal
 * use — but "only under an unusual sequence" is not good enough when the
 * failure mode is hiding an urgent patient, and the fix is one more field.
 */
export function reviewKey(patientId: string, analysisId: number, createdAt: string | null): string {
  return `${patientId}:${analysisId}:${createdAt ?? ''}`
}

/**
 * Reads can fail — Safari private mode throws on access, and a user may have
 * storage disabled entirely. An unreadable store means nothing is reviewed,
 * which shows MORE than expected rather than less. That is the safe direction
 * for a clinical worklist.
 */
export function loadReviewed(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed.filter((k) => typeof k === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

/** Persist, ignoring quota and permission errors — the UI state still updates. */
export function saveReviewed(keys: Set<string>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...keys]))
  } catch {
    /* storage full or unavailable; the list still behaves for this session */
  }
}
