import type { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/api/proxy"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") || "active"
  const patientId = searchParams.get("patient_id")

  const query = new URLSearchParams({ status })
  if (patientId) query.set("patient_id", patientId)

  return proxyToBackend(request, {
    path: `/patients?${query.toString()}`,
    forwardBody: false,
  })
}

export async function POST(request: NextRequest) {
  return proxyToBackend(request, { path: "/patients" })
}
