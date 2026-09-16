import type { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/api/proxy"

/** PUT updates a user's details and permissions; DELETE soft-deletes them. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string }> },
) {
  const { user_id } = await params
  return proxyToBackend(request, { path: `/admin/users/${user_id}` })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string }> },
) {
  const { user_id } = await params
  return proxyToBackend(request, {
    path: `/admin/users/${user_id}`,
    forwardBody: false,
  })
}
