'use client'

/**
 * The light/dark switch, in one place.
 *
 * It used to be a private function inside `app-shell.tsx`, which meant the
 * only way to reach it was to be signed in — the login page, the one screen a
 * judge sees first and before any session exists, had no way to leave dark.
 * Lifting it here is the whole fix; neither caller changes behaviour.
 */

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // next-themes cannot know the theme until after hydration; rendering an icon
  // before then guarantees a mismatch.
  useEffect(() => setMounted(true), [])

  const dark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`grid size-8 place-items-center rounded-md text-[var(--ink-muted)] transition-all hover:bg-[var(--accent)] hover:text-[var(--ink)] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none ${className}`}
    >
      {mounted ? (
        dark ? (
          <Sun className="size-4" />
        ) : (
          <Moon className="size-4" />
        )
      ) : (
        <span className="size-4" />
      )}
    </button>
  )
}
