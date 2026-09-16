'use client'

/**
 * The application shell: rail, header, content.
 *
 * This is a LAYOUT, not part of any screen. The current app draws its own
 * decorative chrome inside `ai-radiology-scan.tsx`, which is precisely why
 * nothing else in the product has navigation — six routes are reachable only
 * by typing their URL (PROJECT_STATE.md problem 6). Anything wrapped in this
 * gets the rail for free.
 *
 * Built on `components/ui/sidebar.tsx` rather than hand-rolled CSS, for the
 * one thing the design specimen could not do: below 768px the rail becomes an
 * off-canvas sheet instead of eating the screen. Collapse, the Ctrl/Cmd+B
 * shortcut and cookie-persisted state come with it.
 */

import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Nav } from './nav'
import { UserMenu } from './user-menu'
import { ThemeToggle } from './theme-toggle'

/**
 * The design system specifies a 272px rail; shadcn's default is 16rem (256px).
 * Studio Admin, which the geometry was measured from, uses 17rem — confirmed
 * by reading its computed `--sidebar-width`.
 */
const SIDEBAR_WIDTH = '17rem'


export function AppShell({
  children,
  breadcrumb,
}: {
  children: ReactNode
  /** e.g. ['Clinical', 'New analysis'] — the last item is the current page. */
  breadcrumb?: string[]
}) {
  return (
    <SidebarProvider style={{ '--sidebar-width': SIDEBAR_WIDTH } as React.CSSProperties}>
      <Sidebar collapsible="icon" className="border-r border-[var(--line)]">
        <SidebarHeader>
          {/*
            A FILLED TILE WITH THE MARK KNOCKED OUT OF IT.

            The mark used to be painted directly in `--brand` on nothing, which
            meant two different logos: a deep green shape on the pale rail in
            light, a pale sage shape on the dark rail in dark. A tile reads the
            same in both, and it gives the wordmark something to sit against.

            36px against 26px, with the mark at 74% of it rather than 68% —
            Ali asked for a bigger area and a bigger mark, and those are two
            separate numbers. The mask stays the technique from 2026-08-08: the
            raster's own colour is #006964, which measures 2.62:1 on the dark
            ground and FAILS §1.4.11, so it is never rendered in it. The token
            supplies the colour and the asset supplies only the shape.
          */}
          {/*
            THE PADDING GOES AWAY WHEN THE RAIL COLLAPSES, and the tile does
            not shrink. Collapsed the rail is 48px. `SidebarHeader` already
            insets 8px, this link inset another 8, and a 36px tile then runs
            16→52px — four past the edge, which is the overlap. Dropping only
            this link's padding puts the tile at 8→44px, so its left edge lines
            up with the nav icons below it (`SidebarGroup` insets the same 8px).

            Then 2px further left, which is not alignment but centring: the
            tile is 36 in a 48px rail, so dead centre is 6px a side, and at 8
            it read right-heavy. The nav icons are 32 wide and centre at 8, so
            only one of the two can be exact — Ali looked at both and chose the
            centred logo over the flush left edge.
          */}
          <Link
            href="/analysis"
            className="flex items-center gap-[11px] p-2 group-data-[collapsible=icon]:-ml-0.5 group-data-[collapsible=icon]:p-0"
          >
            <span
              aria-hidden="true"
              className="grid size-9 flex-none place-items-center rounded-[10px] bg-[var(--logo-tile)]"
            >
              <span
                className="size-full"
                style={{
                  WebkitMaskImage: 'url(/icon-512.png)',
                  maskImage: 'url(/icon-512.png)',
                  WebkitMaskSize: '74%',
                  maskSize: '74%',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskPosition: 'center',
                  backgroundColor: 'var(--logo-mark)',
                }}
              />
            </span>
            <b className="truncate text-[16px] font-semibold tracking-[-0.01em] group-data-[collapsible=icon]:hidden">
              Hepatiq
            </b>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <Nav />
        </SidebarContent>

        <SidebarFooter>
          <UserMenu />
        </SidebarFooter>
      </Sidebar>

      {/*
        bg-transparent, deliberately. SidebarInset ships `bg-background`, which
        is OPAQUE and therefore paints over the fixed gradient mesh — leaving
        the frosted cards inside it with a flat fill to refract, which is
        nothing (LESSONS.md L-020). Transparent lets the mesh reach the
        content, which is the only reason the glass reads as glass.
      */}
      <SidebarInset className="bg-transparent">
        {/* The header follows the scroll so the trigger and breadcrumb stay
            reachable on a long form. */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-[var(--line)] bg-[var(--surface-chrome)] px-5 backdrop-blur-[18px] backdrop-saturate-[180%]">
          <SidebarTrigger className="text-[var(--ink-muted)]" />
          {breadcrumb && breadcrumb.length > 0 && (
            <nav aria-label="Breadcrumb" className="text-[13px] text-[var(--ink-muted)]">
              {breadcrumb.map((crumb, i) => (
                <span key={crumb}>
                  {i > 0 && <span className="px-1.5">/</span>}
                  <span className={i === breadcrumb.length - 1 ? 'font-medium text-[var(--ink)]' : ''}>
                    {crumb}
                  </span>
                </span>
              ))}
            </nav>
          )}
          <span className="flex-1" />
          <ThemeToggle />
        </header>

        {/*
          1440, not 1180. On a 1080p laptop 1180 left ~250px of dead ground on
          each side and squeezed the results screen's charts for no reason.
          It stays capped rather than fluid because CLAUDE.md §7 requires 2K
          not to stretch into unreadable line lengths — this is the widest the
          content gets, not a percentage.
        */}
        <div className="mx-auto w-full max-w-[1440px] px-5 py-6 pb-16">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
