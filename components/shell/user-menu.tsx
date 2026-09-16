'use client'

/**
 * The signed-in user, at the foot of the rail.
 *
 * Real data only: name, role and sign-out all come from `AuthProvider`.
 * Nothing here is a placeholder — the specimen's "isra tahsen / Doctor" was
 * notional, this is not.
 */

import { LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useSidebar } from '@/components/ui/sidebar'

/** Initials from a full name, falling back to the username's first letter. */
function initials(fullName: string, username: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (username[0] ?? '?').toUpperCase()
}

export function UserMenu() {
  const { user, logout } = useAuth()
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'

  // AuthGuard means this is effectively always present, but the shell must not
  // crash if it renders a frame early.
  if (!user) return null

  const name = user.fullName?.trim() || user.username

  return (
    /*
      A CARD, NOT A HAIRLINE AND A LEFTOVER BUTTON.

      Ali: "it feels disconnected and small". It was a 1px rule with a 30px
      avatar hanging under it — the only element in the rail that belonged to
      nothing. Giving it the same surface, border and radius every other card
      in the product uses makes it a component instead of a remainder.

      FLAT, NOT FROSTED. Ali asked for the frosted look and then chose B once
      both were on screen: the rail sits on a near-solid ground, so a
      `backdrop-filter` here would refract almost nothing while making this the
      single frosted surface in the product. LESSONS.md L-028 stands.

      Collapsed, the card comes off entirely. The rail is 48px, `SidebarFooter`
      insets 8 each side, and 10px of card padding around a 30px avatar needs
      50 — it would overflow exactly the way the logo did.
    */
    <div
      className={[
        'flex items-center',
        collapsed
          ? 'justify-center border-t border-[var(--line)] pt-[10px]'
          : 'gap-[10px] rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--surface)] p-[10px] transition-colors duration-150 hover:bg-[var(--surface-chrome)]',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className="grid size-[30px] flex-none place-items-center rounded-full bg-[var(--brand)] text-xs font-semibold text-[var(--brand-ink)]"
      >
        {initials(user.fullName ?? '', user.username)}
      </span>

      {!collapsed && (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium leading-[17px]">{name}</span>
            <span className="block text-[11px] leading-[15px] text-[var(--ink-muted)]">
              {user.role}
            </span>
          </span>
          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            /*
              RED ON HOVER, and `--critical` specifically: it is the token that
              was re-measured for AA on both grounds (globals.css, 2026-08-10),
              where the earlier #E8776B failed at 3.69:1. The tint behind it is
              the same hue at 14%, so the target reads as a target without
              becoming a filled button.
            */
            className="grid size-7 flex-none place-items-center rounded-md text-[var(--ink-muted)] transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--critical)_14%,transparent)] hover:text-[var(--critical)] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <LogOut className="size-4" />
          </button>
        </>
      )}
    </div>
  )
}
