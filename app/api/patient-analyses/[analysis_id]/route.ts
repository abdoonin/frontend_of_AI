import type { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/api/proxy"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ analysis_id: string }> },
) {
  const { analysis_id } = await params
  return proxyToBackend(request, { path: `/patient-analyses/${analysis_id}` })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ analysis_id: string }> },
) {
  const { analysis_id } = await params
  return proxyToBackend(request, {
    path: `/patient-analyses/${analysis_id}`,
    forwardBody: false,
  })
}
