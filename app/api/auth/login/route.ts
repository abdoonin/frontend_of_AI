import type { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/api/proxy"

/**
 * POST /api/auth/login
 *
 * Routed through the Next.js server rather than called directly from the
 * browser so that login works on a deployed domain -- see lib/api/proxy.ts.
 *
 * The backend sets three cookies here (access_token, refresh_token,
 * csrf_token); proxyToBackend relays all of them.
 */
export async function POST(request: NextRequest) {
  return proxyToBackend(request, { path: "/auth/login" })
}
