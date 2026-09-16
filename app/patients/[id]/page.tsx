'use client'

import { Suspense, use, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AuthGuard } from '@/components/auth-guard'
import { AppShell } from '@/components/shell/app-shell'
import { PatientProfile, resolveBackTarget } from '@/components/patients/patient-profile'

/**
 * The profile, plus wherever the reader came from.
 *
 * `?from=` decides both the Back button and the middle breadcrumb, so a
 * patient opened from the follow-up worklist returns to the worklist rather
 * than to the full patient list. When the URL carries no origin — a reload,
 * a bookmark, or a return by some other route — the last one used for this
 * patient in this tab stands in. See `resolveBackTarget`.
 */
function Profile({ patientId }: { patientId: string }) {
  const from = useSearchParams().get('from')
  /* Resolved once, on mount. It reads sessionStorage, so it must not run
     during render on the server — this route is client-only under Suspense,
     and a lazy initializer keeps it to a single read either way. */
  const [back] = useState(() => resolveBackTarget(patientId, from))

  return (
    <AppShell breadcrumb={['Clinical', back.crumb, patientId]}>
      <PatientProfile patientId={patientId} back={back} />
    </AppShell>
  )
}

/**
 * `[id]` is the hospital's patient identifier string, not the numeric primary
 * key — because that is what both list endpoints filter on, and there is no
 * `GET /patients/{id}` to translate one into the other.
 */
export default function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const patientId = decodeURIComponent(id)

  return (
    <AuthGuard>
      {/* useSearchParams opts a route out of prerendering unless it sits under
          a Suspense boundary, which fails the build rather than degrading. The
          params are already in the document, so the fallback never paints. */}
      <Suspense fallback={null}>
        <Profile patientId={patientId} />
      </Suspense>
    </AuthGuard>
  )
}
