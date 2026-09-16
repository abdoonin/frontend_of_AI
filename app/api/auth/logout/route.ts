import type { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/api/proxy"

/**
 * POST /api/auth/logout
 *
 * The backend clears all three auth cookies in its response; those
 * Set-Cookie headers must reach the browser or the session never ends.
 */
export async function POST(request: NextRequest) {
  return proxyToBackend(request, { path: "/auth/logout" })
}
