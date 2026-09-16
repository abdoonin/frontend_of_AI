'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthGuard } from '@/components/auth-guard'
import { useAuth, type UserPermissions } from '@/lib/auth-context'

/**
 * The front door — now a router, not a screen.
 *
 * Until 2026-08-09 this was a four-tab page (AI Analysis / Chatbot / Reports /
 * Medical Records) that was also the ONLY screen with any navigation, which is
 * why six routes were reachable only by typing a URL. Every one of those tabs
 * now has a route of its own and the sidebar in `components/shell/` links
 * them, so the tab shell has nothing left to do.
 *
 * It sends each user to the first destination they may actually use rather
 * than always to /assessment: the nurse preset has no `can_run_analysis`, and
 * landing a nurse on a screen the sidebar deliberately hides from them is the
 * dead end this redesign exists to remove.
 */
const DESTINATIONS: { href: string; permission: keyof UserPermissions }[] = [
  { href: '/analysis', permission: 'can_run_analysis' },
  { href: '/patients', permission: 'can_view_patients' },
  { href: '/reports', permission: 'can_view_reports' },
  { href: '/chatbot', permission: 'can_use_chatbot' },
]

/*
  `/medical-records` was the last entry here until 2026-08-11 and is gone with
  the screen. A user whose ONLY permission is `can_view_records` now falls
  through to the `/analysis` default — the same place every other
  no-match lands. Worth knowing rather than discovering: `can_view_records` no
  longer has a screen of its own, because the records it guarded are archived
  patients and those live on /patients behind its status filter.
*/

function Redirect() {
  const { hasPermission } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const target = DESTINATIONS.find((d) => hasPermission(d.permission))
    // `replace`, not `push` — Back from the landing route should leave the app,
    // not bounce through here and redirect forward again.
    router.replace(target ? target.href : '/analysis')
  }, [hasPermission, router])

  return null
}

export default function Home() {
  return (
    <AuthGuard>
      <Redirect />
    </AuthGuard>
  )
}
