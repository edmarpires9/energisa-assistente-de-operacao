import { NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const USERS_PER_PAGE = 1000

function getMetadataString(user: User, key: string) {
  const value = user.user_metadata[key]
  return typeof value === "string" ? value.trim() : ""
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: "Autenticação necessária." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    )
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "O endpoint de usuários não está configurado no servidor." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }

  const admin = createAdminClient()
  const authUsers: User[] = []

  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: USERS_PER_PAGE,
    })

    if (error) {
      return NextResponse.json(
        { error: "Não foi possível carregar os usuários." },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      )
    }

    authUsers.push(...data.users)
    if (data.users.length < USERS_PER_PAGE) {
      break
    }
  }

  const users = authUsers.map((authUser) => {
    const legacyName = getMetadataString(authUser, "name")
    const firstName =
      getMetadataString(authUser, "first_name") ||
      legacyName.split(/\s+/)[0] ||
      ""
    const lastName =
      getMetadataString(authUser, "last_name") ||
      legacyName.split(/\s+/).slice(1).join(" ")
    const ddd = getMetadataString(authUser, "ddd")
    const telefone = getMetadataString(authUser, "telefone")
    const ddd2 = getMetadataString(authUser, "ddd2")
    const telefone2 = getMetadataString(authUser, "telefone2")

    return {
      name: firstName,
      surname: lastName,
      avatar: getMetadataString(authUser, "avatar") || "/user.png",
      phone: ddd && telefone ? `(${ddd}) ${telefone}` : telefone,
      phone2: ddd2 && telefone2 ? `(${ddd2}) ${telefone2}` : telefone2,
    }
  })

  return NextResponse.json(
    { users },
    { headers: { "Cache-Control": "no-store" } }
  )
}
