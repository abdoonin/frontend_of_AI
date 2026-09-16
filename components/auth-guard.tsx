"use client"

import React, { useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
    children: React.ReactNode
    /** Optional: redirect to login automatically (default true) */
    redirectToLogin?: boolean
}

/**
 * Wrapper component that protects routes:
 * - Shows spinner while auth state is loading
 * - Redirects to /login if no user session
 * - Renders children once authenticated
 */
export function AuthGuard({ children, redirectToLogin = true }: AuthGuardProps) {
    const { user, isLoading, error, refreshUser } = useAuth()
    const redirecting = useRef(false)

    useEffect(() => {
        // Only redirect on a clean "not logged in". If the session check itself
        // failed, show the retry below instead of bouncing to /login, which
        // would just fail there too.
        if (!isLoading && !user && !error && redirectToLogin && !redirecting.current) {
            redirecting.current = true
            window.location.href = "/login"
        }
    }, [isLoading, user, error, redirectToLogin])

    // The session check finished and failed. Give the user a way out -- this
    // path used to render an unrecoverable spinner (PROJECT_STATE.md 1c).
    if (!isLoading && error) {
        return (
            <div className="flex h-screen w-full items-center justify-center gradient-bg p-4">
                <div role="alert" className="flex max-w-sm flex-col items-center gap-4 text-center">
                    <p className="text-base font-medium text-foreground">{error}</p>
                    <p className="text-sm text-muted-foreground">
                        Hepatiq couldn&apos;t confirm your session. The analysis service may be
                        starting up.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            redirecting.current = false
                            refreshUser()
                        }}
                        className="min-h-11 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        Try again
                    </button>
                </div>
            </div>
        )
    }

    if (isLoading || (!user && redirectToLogin)) {
        return (
            <div className="flex h-screen w-full items-center justify-center gradient-bg">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground font-medium">Loading session…</p>
                    {/*
                      Plain <a>, deliberately, and always visible.

                      The watchdog in AuthProvider is a React effect, so it
                      cannot help if React never hydrates -- a failed bundle
                      leaves this spinner frozen with no way out. This link
                      needs no JavaScript, so there is always an escape.

                      It was previously hidden behind `opacity-0 animate-in
                      fade-in [animation-delay:6s]`. That did not work: the
                      `enter` keyframe animates *from* the fade value *to* the
                      element's own style, which `opacity-0` had pinned at 0 --
                      so it stayed invisible indefinitely (measured at 51s).
                      An escape hatch must not depend on anything clever.
                      A healthy load clears this screen in ~35ms, so nobody
                      sees it anyway.
                    */}
                    <a
                        href="/login"
                        className="mt-2 inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        Taking too long? Go to sign in
                    </a>
                </div>
            </div>
        )
    }

    if (!user) {
        return null
    }

    return <>{children}</>
}

