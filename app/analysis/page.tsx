import { AuthGuard } from '@/components/auth-guard'
import { AppShell } from '@/components/shell/app-shell'
import { Assessment } from '@/components/assessment/assessment'

/**
 * The rebuilt assessment.
 *
 * Deliberately NOT wired into `/` yet: the existing AI Analysis tab keeps
 * working untouched so the two can be compared, and so a half-finished
 * replacement can never break the demo path.
 */
export default function AssessmentPage() {
  return (
    <AuthGuard>
      <AppShell breadcrumb={['Clinical', 'New analysis']}>
        <Assessment />
      </AppShell>
    </AuthGuard>
  )
}
