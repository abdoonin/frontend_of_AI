import type { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/api/proxy"

export async function GET(request: NextRequest) {
  const patientId = new URL(request.url).searchParams.get("patientId") ?? ""
  return proxyToBackend(request, {
    path: `/lab-tests?patientId=${encodeURIComponent(patientId)}`,
    forwardBody: false,
  })
}
