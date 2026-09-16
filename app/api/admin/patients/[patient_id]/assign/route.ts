import type { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/api/proxy"

/** Assigns a patient to a doctor. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ patient_id: string }> },
) {
  const { patient_id } = await params
  return proxyToBackend(request, {
    path: `/admin/patients/${patient_id}/assign`,
  })
}
