import type { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/api/proxy"

/**
 * POST /api/auth/register
 *
 * Despite the /auth prefix this is an admin action -- the backend requires
 * `can_manage_users`. It is called from the admin panel's "add user" flow, not
 * from any public sign-up screen.
 */
export async function POST(request: NextRequest) {
  return proxyToBackend(request, { path: "/auth/register" })
}
