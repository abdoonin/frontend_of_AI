'use client'

import { AuthGuard } from '@/components/auth-guard'
import { AppShell } from '@/components/shell/app-shell'
import { BillingDashboard } from '@/components/billing/billing-dashboard'

export default function BillingPage() {
  return (
    <AuthGuard>
      <AppShell breadcrumb={['Clinical', 'Billing & Finance']}>
        <div className="max-w-7xl mx-auto py-2">
          <BillingDashboard />
        </div>
      </AppShell>
    </AuthGuard>
  )
}
