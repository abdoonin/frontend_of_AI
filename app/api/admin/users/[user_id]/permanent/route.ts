import type { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/api/proxy"

/** Hard-deletes a user. Distinct from the soft delete on the parent route. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string }> },
) {
  const { user_id } = await params
  return proxyToBackend(request, {
    path: `/admin/users/${user_id}/permanent`,
    forwardBody: false,
  })
}
