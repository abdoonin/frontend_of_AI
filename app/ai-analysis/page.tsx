'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Redirects to `/assessment`.
 *
 * This route rendered `ai-radiology-scan.tsx` + `ai-analysis-result.tsx` — the
 * screen the rebuild replaces, and the one that still prints "Confidence: 95%"
 * on a healthy result. That is the §6.4 violation this whole phase exists to
 * remove, and the deployment is self-service: a judge with a URL bar can reach
 * any route, so "nobody navigates here" stopped being protection.
 *
 * Nothing is deleted. Both components remain on disk, untouched, pending Ali's
 * confirmation (`CLAUDE.md` §8) — only this three-line wrapper changed, so
 * reverting is one file.
 */
export default function AiAnalysisPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/analysis')
  }, [router])
  return null
}
