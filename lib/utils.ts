import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calls the backend through the Next.js proxy layer under /api.
 *
 * It used to call FastAPI directly on NEXT_PUBLIC_BACKEND_URL. That cannot
 * survive live deployment: `backend/main.py:72` hardcodes its CORS allowlist to
 * localhost, so from a real domain the browser blocks the request. These are
 * now same-origin paths, so CORS never applies and the backend URL is no longer
 * exposed to the client. See PROJECT_STATE.md section 6.1 (decision D-11).
 *
 * `path` is the backend path (e.g. "/admin/users"); the /api prefix is added
 * here so call sites did not have to change.
 *
 * Automatically redirects to /login on 401.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(options.headers)

  // Read the CSRF cookie and attach it as a header for state-changing requests.
  // `verify_csrf` is defined in backend/auth.py but never called today
  // (PROJECT_STATE.md B-12); the proxy forwards this header so that enabling
  // CSRF later does not silently break every mutating request.
  const method = (options.method || "GET").toUpperCase()
  if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    const csrfToken = document.cookie
      .split("; ")
      .find((c) => c.startsWith("csrf_token="))
      ?.split("=")[1]
    if (csrfToken) {
      headers.set("X-CSRF-Token", csrfToken)
    }
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json")
    }
  }

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: "same-origin",
  })

  // Auto-redirect on 401
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login"
  }

  return res
}
