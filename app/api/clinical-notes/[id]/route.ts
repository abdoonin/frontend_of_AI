import type { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/api/proxy"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return proxyToBackend(request, {
    path: `/clinical-notes/${id}`,
    forwardBody: false,
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return proxyToBackend(request, {
    path: `/clinical-notes/${id}`,
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return proxyToBackend(request, {
    path: `/clinical-notes/${id}`,
    forwardBody: false,
  })
}
