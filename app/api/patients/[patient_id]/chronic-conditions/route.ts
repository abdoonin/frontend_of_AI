import type { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/api/proxy"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patient_id: string }> },
) {
  const { patient_id } = await params
  return proxyToBackend(request, {
    path: `/patients/${patient_id}/chronic-conditions`,
    forwardBody: false,
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ patient_id: string }> },
) {
  const { patient_id } = await params
  return proxyToBackend(request, {
    path: `/patients/${patient_id}/chronic-conditions`,
  })
}
