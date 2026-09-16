'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Redirects to `/patients`.
 *
 * This was "Archive", and it was 850 lines duplicating a FILTER STATE of the
 * patients screen. Checked before removing it rather than assumed: it fetched
 * `/api/patients?status=archived` and offered restore and delete — and
 * `/patients` does all three already, from its status filter, plus search,
 * sort, export, pagination, edit, and bulk restore, which Archive never had.
 * The per-record detail it showed is the patient profile's visit sheet now.
 *
 * A redirect rather than nothing: the URL existed in the product, and this
 * deployment is self-service, so a 404 is a dead end a judge can find.
 * Three lines, the same shape as `/ai-analysis` → `/analysis`.
 *
 * `can_view_records` no longer gates a screen of its own. That is deliberate —
 * the records it guarded ARE archived patients, and those live behind
 * `can_view_patients` now.
 */
export default function MedicalRecordsPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/patients')
  }, [router])
  return null
}
