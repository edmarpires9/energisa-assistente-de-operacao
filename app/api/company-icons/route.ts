import { NextResponse } from "next/server"

import { searchGameIcons } from "@/lib/company-icon-catalog"
import { createClient } from "@/lib/supabase/server"

const DEFAULT_PAGE_SIZE = 48
const MAX_PAGE_SIZE = 96

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json(
      { error: "Autenticação necessária." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    )
  }

  const { searchParams } = new URL(request.url)
  const query = (searchParams.get("q") ?? "").trim().slice(0, 100)
  const rawOffset = Number.parseInt(searchParams.get("offset") ?? "0", 10)
  const rawLimit = Number.parseInt(
    searchParams.get("limit") ?? String(DEFAULT_PAGE_SIZE),
    10
  )
  const offset =
    Number.isInteger(rawOffset) && rawOffset > 0 ? Math.min(rawOffset, 5000) : 0
  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE

  const searchTerms = query
    .toLocaleLowerCase("pt-BR")
    .split(/\s+/)
    .filter(Boolean)
  const result = searchGameIcons(searchTerms, offset, limit)

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, max-age=60" },
  })
}
