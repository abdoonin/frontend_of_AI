'use client'

import { AuthGuard } from '@/components/auth-guard'
import { AppShell } from '@/components/shell/app-shell'
import { ReportsOverview } from '@/components/reports/reports-overview'

/**
 * Reports.
 *
 * SWITCHED OVER 2026-08-11. This route served `components/advanced-reports.tsx`
 * — 4,737 lines, four tabs — and now serves the rebuilt Overview.
 *
 * The three other tabs had already become routes of their own: Medical Tools →
 * `/tools`, Case Management → `/follow-up`, Patients → `/patients`. Only
 * Overview was left, and it was the fabricated one — `avgResponseTime = 2.3 //
 * Mock value`, a "Success Rate" that is really the share of analyses with
 * confidence ≥ 80 and therefore always 100%, and four charts buried inside the
 * Medical Tools tab that were unusable to the last one (the reasons are listed
 * in `lib/reports/metrics.ts`).
 *
 * NOTHING IS DELETED. `advanced-reports.tsx` stays on disk, untouched and now
 * unreferenced, pending Ali's confirmation (`CLAUDE.md` §8). Reverting this
 * switch is one import in one file.
 *
 * ⚠ ONE CAPABILITY IS TEMPORARILY UNREACHABLE, and it is a deferral rather than
 * an oversight. `buildReportHTML` (`advanced-reports.tsx:1222`) builds the
 * printable patient report and nothing else owns it, so with the old component
 * off this route there is no way to reach it. Ali's call on 2026-08-11: switch
 * now, wire the report back afterwards. `CLAUDE.md` §6 feature parity is NOT
 * waived — it is outstanding, and `advanced-reports.tsx` must not be deleted
 * until the printable report has a home.
 */
export default function ReportsPage() {
  return (
    <AuthGuard>
      <AppShell breadcrumb={['Clinical', 'Reports']}>
        <ReportsOverview />
      </AppShell>
    </AuthGuard>
  )
}
