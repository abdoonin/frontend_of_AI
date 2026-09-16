import { type NextRequest, NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/api/proxy"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ patient_id: string }> },
) {
  const { patient_id } = await params

  const response = await proxyToBackend(request, {
    path: `/patients/${patient_id}/restore`,
    forwardBody: false,
  })

  // Restoring an already-active patient is not a failure from the user's point
  // of view -- the desired end state is already true. Preserved from the
  // original handler.
  if (response.status === 400) {
    const body = await response.clone().json().catch(() => null)
    if (typeof body?.detail === "string" && body.detail.includes("already active")) {
      return NextResponse.json({ success: true, message: "Patient is already active" })
    }
  }

  return response
}
