'use client'

/**
 * The sidebar's navigation, filtered by what the signed-in user may actually
 * do.
 *
 * Permissions, not role names — `role` is a display label only, and
 * `AuthProvider` already exposes `hasPermission`. Nothing is rendered that
 * would 403 on click.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChartColumn,
  ClipboardPlus,
  ClipboardCheck,
  Calculator,
  MessageCircle,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useAuth, type UserPermissions } from '@/lib/auth-context'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

interface NavItem {
  href: string
  label: string
  icon: typeof Users
  permission?: keyof UserPermissions
}

/**
 * Only routes that EXIST are listed.
 *
 * The first draft of this file linked to /reports, /tools, /assistant,
 * /archive and /admin/audit — none of which have a page. That is exactly the
 * dead-link defect recorded as PROJECT_STATE.md problem 2, where
 * app/patients/page.tsx links to two 404s. A nav item is a promise; an item
 * that 404s is worse than no item at all, especially for a judge clicking
 * around unattended.
 *
 * Items are added here as their screens are built, never before. The target
 * information architecture is in PROJECT_STATE.md §5b.
 */
const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Clinical',
    items: [
      { href: '/analysis', label: 'New analysis', icon: ClipboardPlus, permission: 'can_run_analysis' },
      { href: '/patients', label: 'Patients', icon: Users, permission: 'can_view_patients' },
      /*
        Replaces the Case Management tab. Gated on viewing patients, since
        every row names one — `can_view_reports` would have been wrong, as this
        is a clinical worklist rather than analytics.
      */
      { href: '/follow-up', label: 'Follow-up', icon: ClipboardCheck, permission: 'can_view_patients' },
      { href: '/reports', label: 'Reports', icon: ChartColumn, permission: 'can_view_reports' },
      /*
        ONE GROUP, on Ali's call 2026-08-11. "Reference" held two items and
        "Clinical" five, and a heading over two rows costs more vertical space
        than it saves — a sidebar with three headings for eight destinations is
        mostly headings. Everything a clinician uses now sits together, in the
        order they would reach for it.

        Assistant sits ABOVE Tools, also his call: it is asked a question far
        more often than a calculator is opened.
      */
      { href: '/chatbot', label: 'Assistant', icon: MessageCircle, permission: 'can_use_chatbot' },
      /*
        No permission, deliberately. The calculators are pure client-side
        arithmetic over values the user types in, and the reference tables are
        static — nothing here reads a patient, calls the backend or needs a
        role. Gating it behind `can_view_reports` (where it used to live, buried
        in the Reports tab) would hide it from the nurse preset for no reason,
        and that preset is already down to three items.
      */
      { href: '/tools', label: 'Tools', icon: Calculator },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/admin', label: 'Users & permissions', icon: ShieldCheck, permission: 'can_manage_users' },
    ],
  },
]

export function Nav() {
  const { hasPermission } = useAuth()
  const pathname = usePathname()

  return (
    <>
      {GROUPS.map((group) => {
        const items = group.items.filter((i) => !i.permission || hasPermission(i.permission))
        // An empty group would render a heading over nothing.
        if (items.length === 0) return null

        return (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--ink-muted)]">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={
                        // 36px and a 10px gap, matching the specimen's rail --
                        // shadcn ships h-8 with gap-2.
                        'h-9 gap-[10px] text-[var(--ink)] ' +
                        'data-[active=true]:bg-[var(--brand)] data-[active=true]:text-[var(--brand-ink)] data-[active=true]:font-medium ' +
                        'hover:bg-[var(--accent)] hover:text-[var(--ink)] ' +
                        '[&>svg]:size-[17px] [&>svg]:opacity-75 data-[active=true]:[&>svg]:opacity-100'
                      }
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        )
      })}
    </>
  )
}
