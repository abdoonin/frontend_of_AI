import type { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/api/proxy"

export async function GET(request: NextRequest) {
  return proxyToBackend(request, { path: "/admin/users", forwardBody: false })
}
