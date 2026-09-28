'use client'

import { AuthGuard } from '@/components/auth-guard'
import { AppShell } from '@/components/shell/app-shell'
import { PrescriptionsList } from '@/components/prescriptions/prescriptions-list'

export default function PrescriptionsPage() {
  return (
    <AuthGuard>
      <AppShell breadcrumb={['Clinical', 'Prescriptions']}>
        <div className="max-w-6xl mx-auto py-2">
          <PrescriptionsList />
        </div>
      </AppShell>
    </AuthGuard>
  )
}
