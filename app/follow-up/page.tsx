'use client'

import { AuthGuard } from '@/components/auth-guard'
import { AppShell } from '@/components/shell/app-shell'
import { FollowUpList } from '@/components/worklist/follow-up-list'

/**
 * Follow-up — the Case Management replacement.
 *
 * Built as a PARALLEL ROUTE (REFACTOR_WORKFLOW.md §5). The old tab still runs
 * inside `components/advanced-reports.tsx` and was not touched; removing it is
 * a separate, reversible commit.
 *
 * The old tab seeded three invented patients into the visitor's own
 * localStorage on first load, in the wrong specialty entirely — chemotherapy
 * cycles, cardiology consultations, insulin adjustments and an MRI, in a liver
 * product that does no imaging. Nothing here is stored or invented: every row
 * is computed from analyses already in the database.
 */
export default function FollowUpPage() {
  return (
    <AuthGuard>
      <AppShell breadcrumb={['Clinical', 'Follow-up']}>
        <FollowUpList />
      </AppShell>
    </AuthGuard>
  )
}
