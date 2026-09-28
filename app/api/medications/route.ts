import type { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/api/proxy"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")
  const category = searchParams.get("category")

  const query = new URLSearchParams()
  if (q) query.set("q", q)
  if (category) query.set("category", category)

  const queryString = query.toString()
  const path = queryString ? `/medications?${queryString}` : "/medications"

  return proxyToBackend(request, {
    path,
    forwardBody: false,
  })
}

export async function POST(request: NextRequest) {
  return proxyToBackend(request, { path: "/medications" })
}
