'use client'

import { AuthGuard } from '@/components/auth-guard'
import { AppShell } from '@/components/shell/app-shell'
import { PatientsTable } from '@/components/patients/patients-table'

/**
 * The patient list.
 *
 * Replaces `PatientManagement`'s card grid with a real data table — search,
 * sorting, filtering and pagination — and every row opens a profile, which is
 * the thing the product has never had.
 *
 * `PatientManagement` is NOT deleted: it still owns add and edit, which this
 * screen does not do yet. It stays on disk until that capability is rebuilt
 * here, per CLAUDE.md §6 feature parity.
 */
export default function PatientsPage() {
  return (
    <AuthGuard>
      {/* The heading lives INSIDE the table's container, as it does in the
          reference dashboards — one panel holding title, controls, rows and
          pagination, rather than a floating heading above a floating table. */}
      <AppShell breadcrumb={['Clinical', 'Patients']}>
        <PatientsTable />
      </AppShell>
    </AuthGuard>
  )
}
