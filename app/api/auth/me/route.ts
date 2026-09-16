import type { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/api/proxy"

/**
 * GET /api/auth/me
 *
 * Returns the current user and their permissions, or 401 when there is no
 * valid session. The 401 must survive the proxy unchanged -- AuthGuard relies
 * on seeing it to redirect to /login.
 */
export async function GET(request: NextRequest) {
  return proxyToBackend(request, { path: "/auth/me", forwardBody: false })
}
