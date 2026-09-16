'use client'

/**
 * The one hover card this page uses, and the one place its geometry lives.
 *
 * WHY IT FLIPS. Every hover card here was `absolute` with `left: x + 14`
 * inside the card being hovered. An absolutely positioned box shrink-to-fits
 * the space remaining in its containing block, so hovering the right-hand side
 * of a card did not clip the tooltip — it COMPRESSED it, wrapping "Busiest
 * month" onto two lines while empty page sat beside it. That reads as a bug
 * because it is one.
 *
 * Two changes fix it. `w-max` stops the shrink-to-fit, so the box is always
 * the width of its content. And past the container's midpoint the card opens
 * leftward from the cursor instead of rightward, which keeps it on screen.
 *
 * The flip is decided from the cursor position alone — no measuring of the
 * card's own width — because measuring costs a layout pass and would show one
 * frame in the wrong place before correcting itself.
 */

import type React from 'react'

/** Cursor position within the hovered element, plus that element's width. */
export type CursorPos = { x: number; y: number; w: number }

/** Read a mouse event into a `CursorPos` relative to the element handling it. */
export function cursorIn(e: React.MouseEvent<HTMLElement>): CursorPos {
  const r = e.currentTarget.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width }
}

export function HoverCard({
  pos,
  children,
}: {
  pos: CursorPos
  children: React.ReactNode
}) {
  const flip = pos.x > pos.w / 2

  return (
    <div
      role="tooltip"
      /* `pointer-events-none` or the card would flicker: the tooltip would sit
         under the cursor, take the hover, and unmount itself. */
      className="border-border/50 bg-popover text-popover-foreground pointer-events-none absolute z-30 grid w-max min-w-[9rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl"
      style={{
        left: pos.x + (flip ? -14 : 14),
        top: pos.y + 14,
        transform: flip ? 'translateX(-100%)' : undefined,
      }}
    >
      {children}
    </div>
  )
}
