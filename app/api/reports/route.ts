import type { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/api/proxy"

/** Saves an analysis against a patient record. */
export async function POST(request: NextRequest) {
  return proxyToBackend(request, { path: "/reports" })
}
