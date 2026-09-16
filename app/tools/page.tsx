'use client'

import { AuthGuard } from '@/components/auth-guard'
import { AppShell } from '@/components/shell/app-shell'
import { Calculators } from '@/components/tools/calculators'
import { LabReference, Abbreviations } from '@/components/tools/lab-reference'

/**
 * Clinical tools — the calculators and reference material.
 *
 * Built as a PARALLEL ROUTE (REFACTOR_WORKFLOW.md §5). The originals are still
 * running inside `components/advanced-reports.tsx` on the Reports tab and were
 * not touched; removing them from that file is a separate, reversible commit
 * once this screen has been used in anger.
 *
 * Four of the five calculators were arithmetically or clinically wrong — the
 * dose tool printed "0.5 mg" and "250000 mg/mL" for its own placeholder
 * values, and the eGFR still carried the race coefficient dropped from practice
 * in 2021. `.verify/calculators.mts` asserts every formula against published
 * worked examples a referee could reproduce by hand.
 */
export default function ToolsPage() {
  return (
    <AuthGuard>
      <AppShell breadcrumb={['Clinical', 'Tools']}>
        <div className="flex flex-col gap-4">
          <Calculators />

          {/* Reference sits below the calculators: it is what you consult, not
              what you came to do.

              STACKED, NOT SIDE BY SIDE. Two panels in a grid row stretch to the
              taller one, which left the abbreviations half empty. Each now runs
              full width and flows its own rows into columns, so both are as
              short as their content allows and neither pads the other. */}
          <LabReference />
          <Abbreviations />
        </div>
      </AppShell>
    </AuthGuard>
  )
}
