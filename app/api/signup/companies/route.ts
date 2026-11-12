import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch (error) {
    console.error("Failed to initialize public signup companies:", error)
    return NextResponse.json(
      { error: "Não foi possível carregar as empresas." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    )
  }

  const { data, error } = await supabase
    .from("companies")
    .select("id, name, icon, color")
    .order("name", { ascending: true })

  if (error) {
    console.error("Failed to load companies for signup:", error)
    return NextResponse.json(
      { error: "Não foi possível carregar as empresas." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }

  return NextResponse.json(
    { companies: data },
    { headers: { "Cache-Control": "no-store" } }
  )
}
