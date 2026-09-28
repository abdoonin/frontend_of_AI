import type { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/api/proxy"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get("patient_id")
  const limit = searchParams.get("limit")

  const query = new URLSearchParams()
  if (patientId) query.set("patient_id", patientId)
  if (limit) query.set("limit", limit)

  const queryString = query.toString()
  const path = queryString ? `/clinical-notes?${queryString}` : "/clinical-notes"

  return proxyToBackend(request, {
    path,
    forwardBody: false,
  })
}

export async function POST(request: NextRequest) {
  return proxyToBackend(request, { path: "/clinical-notes" })
}
