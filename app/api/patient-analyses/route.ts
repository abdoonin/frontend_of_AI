import type { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/api/proxy"

/**
 * GET /api/patient-analyses
 *
 * Supports ?patient_id= and ?include_archived=. This is the endpoint the
 * patient monitoring view is built on -- it returns `detailed_results`, which
 * holds the real per-model values. See CLAUDE.md section 6.4.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = new URLSearchParams()

  const includeArchived = searchParams.get("include_archived")
  const patientId = searchParams.get("patient_id")
  if (includeArchived) query.set("include_archived", includeArchived)
  if (patientId) query.set("patient_id", patientId)

  const qs = query.toString()
  return proxyToBackend(request, {
    path: `/patient-analyses${qs ? `?${qs}` : ""}`,
    forwardBody: false,
  })
}
