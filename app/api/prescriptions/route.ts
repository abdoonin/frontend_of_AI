import type { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/api/proxy"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get("patient_id")

  const query = new URLSearchParams()
  if (patientId) query.set("patient_id", patientId)

  const queryString = query.toString()
  const path = queryString ? `/prescriptions?${queryString}` : "/prescriptions"

  return proxyToBackend(request, {
    path,
    forwardBody: false,
  })
}

export async function POST(request: NextRequest) {
  return proxyToBackend(request, { path: "/prescriptions" })
}
