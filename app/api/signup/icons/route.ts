import { NextResponse } from "next/server"

import { searchGameIcons } from "@/lib/company-icon-catalog"

const DEFAULT_PAGE_SIZE = 48
const MAX_PAGE_SIZE = 96

export async function GET(request: Request) {
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

  return NextResponse.json(searchGameIcons(searchTerms, offset, limit), {
    headers: { "Cache-Control": "public, max-age=60" },
  })
}
