import { type NextRequest, NextResponse } from "next/server"

/**
 * Server-side proxy helper for Next.js route handlers.
 *
 * Every backend call goes browser -> Next.js server -> FastAPI. The browser
 * never talks to FastAPI directly, which is what makes live deployment work:
 * `backend/main.py` hardcodes its CORS allowlist to localhost, so a browser on
 * a real domain would be blocked. Server-to-server calls are not subject to
 * CORS at all. See PROJECT_STATE.md section 6.1 (decision D-11).
 *
 * This replaces the `getAuthHeaders()` helper that was copy-pasted verbatim
 * into all 11 route handlers.
 */

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000"

/**
 * Relay Set-Cookie headers from the backend response to the browser.
 *
 * `/auth/login` and `/auth/refresh` set THREE cookies (access_token,
 * refresh_token, csrf_token) and `/auth/logout` clears them. Reading them with
 * `headers.get("set-cookie")` returns a single comma-joined string, which
 * corrupts any cookie containing a comma -- `Expires=Wed, 01 Jan ...` always
 * does. `getSetCookie()` returns them as a correct array (Node 18.14+).
 */
function relaySetCookies(from: Response, to: NextResponse): void {
  const cookies =
    typeof from.headers.getSetCookie === "function"
      ? from.headers.getSetCookie()
      : []

  for (const cookie of cookies) {
    to.headers.append("set-cookie", cookie)
  }
}

/**
 * Build the headers sent on to FastAPI.
 *
 * - `cookie` carries the session; without it every call is unauthenticated.
 * - `x-csrf-token` is forwarded for correctness. `verify_csrf` exists in
 *   `backend/auth.py` but is never called today (PROJECT_STATE.md B-12), so
 *   nothing checks it yet -- forwarding it now means enabling CSRF later does
 *   not silently break every mutating request through this proxy.
 */
function buildForwardHeaders(request: NextRequest, hasBody: boolean): Headers {
  const headers = new Headers()

  const cookie = request.headers.get("cookie")
  if (cookie) headers.set("cookie", cookie)

  const csrf = request.headers.get("x-csrf-token")
  if (csrf) headers.set("x-csrf-token", csrf)

  if (hasBody) headers.set("content-type", "application/json")

  return headers
}

export interface ProxyOptions {
  /** Backend path including any query string, e.g. "/admin/users?page=1" */
  path: string
  /** Defaults to the incoming request's method. */
  method?: string
  /**
   * Set false for endpoints that must not receive a body (GET/DELETE).
   * Defaults to true for POST/PUT/PATCH.
   */
  forwardBody?: boolean
}

/**
 * Forward a request to FastAPI and return its response essentially unchanged.
 *
 * Deliberately preserves the backend's status code. The pre-existing handlers
 * threw on `!res.ok` and returned a blanket 500, which destroyed 401s -- and
 * the auth flow depends on seeing a real 401 to redirect to /login.
 */
export async function proxyToBackend(
  request: NextRequest,
  options: ProxyOptions,
): Promise<NextResponse> {
  const method = (options.method ?? request.method).toUpperCase()
  const canHaveBody = method === "POST" || method === "PUT" || method === "PATCH"
  const forwardBody = options.forwardBody ?? canHaveBody

  let body: string | undefined
  if (forwardBody) {
    const raw = await request.text()
    body = raw.length > 0 ? raw : undefined
  }

  try {
    const backendResponse = await fetch(`${BACKEND_URL}${options.path}`, {
      method,
      headers: buildForwardHeaders(request, body !== undefined),
      body,
      // Never cache authenticated responses.
      cache: "no-store",
    })

    const text = await backendResponse.text()
    let payload: unknown
    try {
      payload = text.length > 0 ? JSON.parse(text) : {}
    } catch {
      // Backend returned something that is not JSON. Surface it rather than
      // masking it as a generic failure.
      payload = { detail: text }
    }

    const response = NextResponse.json(payload, {
      status: backendResponse.status,
    })
    relaySetCookies(backendResponse, response)
    return response
  } catch (error) {
    // Only reached when the backend is unreachable -- a genuine 502.
    console.error(`Proxy error for ${method} ${options.path}:`, error)
    return NextResponse.json(
      { detail: "Cannot reach the analysis backend." },
      { status: 502 },
    )
  }
}
