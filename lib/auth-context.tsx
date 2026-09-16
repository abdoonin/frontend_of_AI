"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { clearStoredAssessment } from "@/lib/assessment/storage"

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
export interface UserPermissions {
  can_view_dashboard: boolean
  can_run_analysis: boolean
  can_use_chatbot: boolean
  can_view_reports: boolean
  can_view_patients: boolean
  can_create_patients: boolean
  can_edit_patients: boolean
  can_delete_patients: boolean
  can_view_records: boolean
  can_manage_users: boolean
  can_view_audit_logs: boolean
  can_access_admin: boolean
}

export interface AuthUser {
  id: number
  username: string
  email: string
  fullName: string
  role: string
  permissions: UserPermissions
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  /**
   * Set when the session could not be checked at all (server unreachable or
   * timed out) -- as opposed to a clean 401, which just means "not logged in".
   * Screens use this to show a retry instead of spinning forever.
   */
  error: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  hasPermission: (perm: keyof UserPermissions) => boolean
}

/** Abort the session check after this long. */
const SESSION_CHECK_TIMEOUT_MS = 8000

/**
 * Absolute ceiling on how long `isLoading` may stay true, whatever happens.
 *
 * This is the guard against the infinite-spinner bug (PROJECT_STATE.md problem
 * 1c): three screens render a full-page spinner off `isLoading`, so any path
 * that left it true was unrecoverable without a manual refresh. With this
 * watchdog the spinner always resolves into either the app or a retry screen.
 */
const LOADING_WATCHDOG_MS = 12000

// Auth goes through the Next.js server, never browser -> FastAPI directly.
// The backend's CORS allowlist is hardcoded to localhost (backend/main.py:72),
// so a direct call from a deployed domain is blocked and login fails. These
// are same-origin paths, so no CORS applies. See PROJECT_STATE.md section 6.1.
const AUTH_ME = "/api/auth/me"
const AUTH_LOGIN = "/api/auth/login"
const AUTH_LOGOUT = "/api/auth/logout"

// ─────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch current user from /auth/me (cookie is sent automatically)
  const refreshUser = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), SESSION_CHECK_TIMEOUT_MS)

    try {
      const res = await fetch(AUTH_ME, {
        credentials: "same-origin",
        signal: controller.signal,
      })

      // A 401 is a normal answer, not a failure: it means "no session".
      if (res.status === 401) {
        setUser(null)
        return
      }

      if (!res.ok) throw new Error(`Session check failed (${res.status})`)

      setUser(await res.json())
    } catch {
      // Genuine failure -- server unreachable or timed out. Distinguished from
      // a 401 so the UI can offer a retry rather than pretending we are simply
      // logged out.
      setUser(null)
      setError("Couldn't reach the server.")
    } finally {
      clearTimeout(timeout)
      setIsLoading(false)
    }
  }, [])

  // On mount, try to restore session. The ref keeps React 18 StrictMode from
  // firing this twice in development.
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true
    refreshUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Watchdog: `isLoading` may never stay true indefinitely.
   *
   * `refreshUser` clears it in a `finally`, so in theory this never fires. It
   * exists because in practice it did -- and because the failure mode was a
   * dead full-screen spinner with no way out but a manual refresh. On a
   * self-service deployment that is fatal: a judge closes the tab.
   */
  useEffect(() => {
    if (!isLoading) return
    const bail = setTimeout(() => {
      setIsLoading(false)
      setError((prev) => prev ?? "The server took too long to respond.")
    }, LOADING_WATCHDOG_MS)
    return () => clearTimeout(bail)
  }, [isLoading])

  // Login
  const login = useCallback(
    async (username: string, password: string) => {
      const res = await fetch(AUTH_LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username, password }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Login failed" }))
        throw new Error(err.detail || "Login failed")
      }

      const data = await res.json()

      // 1. Save marker to storage BEFORE navigation
      localStorage.setItem("user_session_active", "true")

      // Whoever signs in next starts with an empty assessment. sessionStorage
      // belongs to the TAB, not the session, so without this a sign-out and
      // sign-in in the same tab handed the next user the previous patient's
      // blood work already typed into the form.
      clearStoredAssessment()

      // 2. ATOMIC NAVIGATION: No setUser() call - just redirect
      // The hard reload will force the App to re-mount and read from storage
      const isAdmin = data.user?.permissions?.can_access_admin
      window.location.href = isAdmin ? "/admin" : "/"
    },
    [],
  )

  // Logout
  const logout = useCallback(async () => {
    // 1. Clear storage immediately - SYNCHRONOUS
    localStorage.removeItem("user_session_active")
    // Patient data must not outlive the session that entered it.
    clearStoredAssessment()

    try {
      await fetch(AUTH_LOGOUT, {
        method: "POST",
        credentials: "same-origin",
      })
    } catch (err) {
      console.error("logout error:", err)
    } finally {
      // 2. ATOMIC NAVIGATION: No setUser(null) - just redirect
      window.location.href = "/login"
    }
  }, [])

  // Permission check
  const hasPermission = useCallback(
    (perm: keyof UserPermissions): boolean => {
      if (!user) return false
      return !!user.permissions?.[perm]
    },
    [user],
  )

  return (
    <AuthContext.Provider
      value={{ user, isLoading, error, login, logout, refreshUser, hasPermission }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
