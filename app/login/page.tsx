"use client"

import React, { useRef, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react"
import styles from "./login.module.css"
import { ThemeToggle } from "@/components/shell/theme-toggle"

type FieldErrors = { username?: string; password?: string }

export default function LoginPage() {
    const { login, user, isLoading: authLoading, error: authError } = useAuth()
    const router = useRouter()

    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

    const usernameRef = useRef<HTMLInputElement>(null)
    const passwordRef = useRef<HTMLInputElement>(null)

    // If already logged in, redirect
    React.useEffect(() => {
        if (!authLoading && user) {
            router.push("/")
        }
    }, [user, authLoading, router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        // Read from the DOM rather than state. A password manager can fill an
        // input without firing React's onChange, which would leave `username`
        // and `password` empty in state -- the same failure that made the old
        // Sign In button silently dead. The refs always hold what the user (or
        // their manager) actually put there.
        const u = usernameRef.current?.value.trim() ?? ""
        const p = passwordRef.current?.value ?? ""

        // Our own validation, because the form is `noValidate`. The browser's
        // native bubble cannot be styled in any browser, is not reliably
        // announced by screen readers, and vanishes on blur.
        const next: FieldErrors = {}
        if (!u) next.username = "Enter your username."
        if (!p) next.password = "Enter your password."
        setFieldErrors(next)

        if (next.username) {
            usernameRef.current?.focus()
            return
        }
        if (next.password) {
            passwordRef.current?.focus()
            return
        }

        setIsSubmitting(true)
        try {
            await login(u, p)
        } catch (err: any) {
            setError(err.message || "Invalid credentials. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    // Only spin while the session check is genuinely in flight. `authError`
    // means the check finished and failed -- fall through to the form, which
    // shows the reason, rather than spinning forever (problem 1c).
    if (authLoading && !authError) {
        return (
            <div className={styles.loading}>
                <Loader2 className="h-10 w-10 animate-spin" style={{ color: "var(--brand)" }} aria-hidden="true" />
                <span className={styles.loadingText}>Loading session…</span>
                {/*
                  No-JS escape hatch. Plain and always visible on purpose -- a
                  fallback is exercised precisely when things are already
                  broken, so it must have the fewest moving parts in the
                  codebase (LESSONS.md L-015). A healthy load clears this in
                  ~35ms, so nobody sees it.
                */}
                <a href="/login" className={styles.escape}>
                    Taking too long? Reload
                </a>
            </div>
        )
    }

    const message = error || authError

    return (
        <div className={styles.page}>
            <ThemeToggle className={styles.themeToggle} />
            <main className={styles.card}>
                <section className={styles.formSide}>
                    <div className={styles.brand}>
                        <span className={styles.tile} aria-hidden="true">
                            <span className={styles.mark} />
                        </span>
                        <b className={styles.wordmark}>Hepatiq</b>
                    </div>

                    <h1 className={styles.title}>Sign in to Hepatiq</h1>
                    <p className={styles.sub}>
                        Liver disease analysis using artificial intelligence
                        <br />
                        and patient monitoring.
                    </p>

                    {/* role=alert so a failed sign-in is announced, never silent.
                        Colour is paired with an icon and text -- state is never
                        carried by colour alone. */}
                    {message && (
                        <div role="alert" className={styles.error}>
                            <AlertCircle className={styles.errorIcon} size={16} aria-hidden="true" />
                            <span>{message}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate>
                        <div className={styles.fieldWrap}>
                            <label className={styles.label} htmlFor="username">
                                Username
                            </label>
                            <div className={styles.inputRow}>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    ref={usernameRef}
                                    className={`${styles.input} ${fieldErrors.username ? styles.inputInvalid : ""}`}
                                    placeholder="Your username"
                                    value={username}
                                    onChange={(e) => {
                                        setUsername(e.target.value)
                                        if (fieldErrors.username) setFieldErrors((f) => ({ ...f, username: undefined }))
                                    }}
                                    aria-invalid={!!fieldErrors.username}
                                    aria-describedby={fieldErrors.username ? "username-error" : undefined}
                                    autoComplete="username"
                                    autoFocus
                                />
                            </div>
                            {fieldErrors.username && (
                                <p className={styles.fieldError} id="username-error">
                                    <AlertCircle size={14} aria-hidden="true" />
                                    <span>{fieldErrors.username}</span>
                                </p>
                            )}
                        </div>

                        <div className={styles.fieldWrap}>
                            <label className={styles.label} htmlFor="password">
                                Password
                            </label>
                            <div className={styles.inputRow}>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    ref={passwordRef}
                                    className={`${styles.input} ${styles.passwordInput} ${fieldErrors.password ? styles.inputInvalid : ""}`}
                                    placeholder="Your password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value)
                                        if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }))
                                    }}
                                    aria-invalid={!!fieldErrors.password}
                                    aria-describedby={fieldErrors.password ? "password-error" : undefined}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className={styles.peek}
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    aria-pressed={showPassword}
                                >
                                    {showPassword ? (
                                        <EyeOff size={17} aria-hidden="true" />
                                    ) : (
                                        <Eye size={17} aria-hidden="true" />
                                    )}
                                </button>
                            </div>
                            {fieldErrors.password && (
                                <p className={styles.fieldError} id="password-error">
                                    <AlertCircle size={14} aria-hidden="true" />
                                    <span>{fieldErrors.password}</span>
                                </p>
                            )}
                        </div>

                        {/*
                          Disabled ONLY while submitting -- never on empty
                          fields. See the ref-reading note in handleSubmit: a
                          manager-filled form must still be submittable, and
                          WCAG 2.2 3.3.8 requires it.
                        */}
                        <button type="submit" className={styles.submit} disabled={isSubmitting}>
                            {isSubmitting ? "Signing in…" : "Sign in"}
                        </button>
                    </form>

                    <p className={styles.helper}>
                        Accounts are created by your administrator. If you cannot sign in or need
                        access, contact them directly.
                    </p>

                    <p className={styles.foot}>Northern Technical University - Team&nbsp;Diqa</p>
                </section>

                <figure className={styles.art}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/liver-720.webp" alt="" width={720} height={663} />
                    <figcaption className={styles.caption}>
                        Hepatiq turns complex clinical data into clear insights
                        <br />
                        that help clinicians identify potential
                        <br />
                        liver disease sooner.
                    </figcaption>
                </figure>
            </main>
        </div>
    )
}
