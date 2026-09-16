'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Redirects to `/reports`.
 *
 * This was the parallel route the rebuilt Overview was developed on
 * (REFACTOR_WORKFLOW.md §5). `/reports` now serves that screen directly, so
 * leaving this rendering it as well would mean two live URLs showing the same
 * page — and the deployment is self-service, so a judge with a URL bar can find
 * a duplicate as easily as a dead end.
 *
 * A redirect rather than a deletion: `CLAUDE.md` §8 says never delete a file
 * without listing it first, and this one is listed for removal in
 * `PROJECT_STATE.md`. Same three-line shape as `/ai-analysis` → `/analysis`.
 */
export default function ReportsNextPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/reports')
  }, [router])
  return null
}
