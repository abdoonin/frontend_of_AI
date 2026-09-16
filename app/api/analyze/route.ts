import type { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/api/proxy"

/**
 * POST /api/analyze
 *
 * Carries all four analysis modes: gate, cancer, fatty_liver, hepatitis.
 * The body shape differs per mode -- three send flat fields and hepatitis nests
 * everything under `user_profile` (PROJECT_STATE.md B-9) -- so it is forwarded
 * verbatim rather than reshaped here.
 */
export async function POST(request: NextRequest) {
  return proxyToBackend(request, { path: "/analyze" })
}
