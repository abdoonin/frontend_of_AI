/**
 * Where the in-progress assessment is kept between renders.
 *
 * Its own module so `lib/auth-context.tsx` can clear it on sign-in and
 * sign-out without importing `use-assessment.ts` — which would drag the field
 * registry, the presets and the analyze client into every page's bundle,
 * including the login screen.
 *
 * Session, not local: values are meant to survive a mis-click or a reload
 * during one sitting, never a new sign-in. sessionStorage does not expire on
 * logout by itself — the tab keeps it — which is why signing out and back in
 * used to hand the next user a form already full of the previous patient's
 * blood work.
 */

export const ASSESSMENT_STORAGE_KEY = 'hepatiq_assessment_values'

export function clearStoredAssessment(): void {
  try {
    sessionStorage.removeItem(ASSESSMENT_STORAGE_KEY)
  } catch {
    /* private mode, or called server-side. Nothing here is worth throwing over. */
  }
}
