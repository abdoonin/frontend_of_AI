import type { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/api/proxy"

/** Paginated audit log. Query string is forwarded verbatim. */
export async function GET(request: NextRequest) {
  const query = new URL(request.url).search
  return proxyToBackend(request, {
    path: `/admin/audit-logs${query}`,
    forwardBody: false,
  })
}
