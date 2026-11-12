import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

type PersonInput = {
  first_name: string
  last_name: string
  phone1: string | null
  phone2: string | null
  company: string
}

const PERSON_FIELDS =
  "id, auth_user_id, first_name, last_name, phone1, phone2, company:contractor, created_by_name, created_at, updated_by_name, updated_at"

const MIGRATIONS_REQUIRED_MESSAGE =
  "O banco ainda não está configurado para contatos. Execute as migrations 20261108000000_create_shared_people.sql e 20261108000100_link_users_to_people.sql, nessa ordem, no SQL Editor do Supabase."

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isPeopleSchemaError(error: { code?: string }) {
  return (
    error.code === "PGRST205" ||
    error.code === "PGRST204" ||
    error.code === "42P01" ||
    error.code === "42703"
  )
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  )
}

function normalizePhone(value: unknown, optional: boolean) {
  if (typeof value !== "string") {
    return null
  }

  const digits = value.replace(/\D/g, "")
  if (!digits && optional) {
    return ""
  }

  return /^\d{10,13}$/.test(digits) ? digits : null
}

function getProfilePhoneFields(phone: string | null, suffix: "" | "2") {
  const digits = phone ?? ""
  const national =
    digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits

  return {
    [`ddd${suffix}`]: national ? national.slice(0, 2) : "",
    [`telefone${suffix}`]: national ? national.slice(2) : "",
  }
}

function parsePersonInput(
  value: unknown,
  allowMissingPhone: boolean
): PersonInput | null {
  if (!isRecord(value)) {
    return null
  }

  const firstName =
    typeof value.first_name === "string" ? value.first_name.trim() : ""
  const lastName =
    typeof value.last_name === "string" ? value.last_name.trim() : ""
  const company = typeof value.company === "string" ? value.company.trim() : ""
  const phone1 = normalizePhone(value.phone1 ?? "", allowMissingPhone)
  const phone2 = normalizePhone(value.phone2 ?? "", true)

  if (
    !firstName ||
    !lastName ||
    !company ||
    phone1 === null ||
    (!allowMissingPhone && phone1 === "") ||
    phone2 === null
  ) {
    return null
  }

  return {
    first_name: firstName,
    last_name: lastName,
    phone1: phone1 || null,
    phone2: phone2 || null,
    company,
  }
}

async function getAuthenticatedClient() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return supabase
}

function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Autenticação necessária." },
    { status: 401, headers: { "Cache-Control": "no-store" } }
  )
}

async function readBody(request: Request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

export async function GET() {
  const supabase = await getAuthenticatedClient()
  if (!supabase) {
    return unauthorizedResponse()
  }

  const { data, error } = await supabase
    .from("people")
    .select(PERSON_FIELDS)
    .order("first_name", { ascending: true })
    .order("last_name", { ascending: true })

  if (error) {
    console.error("Failed to load shared people:", error)
    return NextResponse.json(
      {
        error: isPeopleSchemaError(error)
          ? MIGRATIONS_REQUIRED_MESSAGE
          : "Não foi possível carregar as pessoas.",
      },
      {
        status: isPeopleSchemaError(error) ? 503 : 500,
        headers: { "Cache-Control": "no-store" },
      }
    )
  }

  return NextResponse.json(
    { people: data },
    { headers: { "Cache-Control": "no-store" } }
  )
}

export async function POST(request: Request) {
  const supabase = await getAuthenticatedClient()
  if (!supabase) {
    return unauthorizedResponse()
  }

  const input = parsePersonInput(await readBody(request), false)
  if (!input) {
    return NextResponse.json(
      {
        error: "Confira nome, sobrenome, telefone e empresa.",
      },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("people")
    .insert({
      ...input,
      company: input.company,
    })
    .select(PERSON_FIELDS)
    .single()

  if (error) {
    console.error("Failed to create shared person:", error)
    return NextResponse.json(
      {
        error: isPeopleSchemaError(error)
          ? MIGRATIONS_REQUIRED_MESSAGE
          : "Não foi possível cadastrar a pessoa.",
      },
      { status: isPeopleSchemaError(error) ? 503 : 500 }
    )
  }

  return NextResponse.json({ person: data }, { status: 201 })
}

export async function PATCH(request: Request) {
  const supabase = await getAuthenticatedClient()
  if (!supabase) {
    return unauthorizedResponse()
  }

  const body: unknown = await readBody(request)
  if (!isRecord(body) || !isUuid(body.id)) {
    return NextResponse.json(
      { error: "Identificador da pessoa inválido." },
      { status: 400 }
    )
  }

  const input = parsePersonInput(body, true)
  if (!input) {
    return NextResponse.json(
      {
        error: "Confira nome, sobrenome, telefone e empresa.",
      },
      { status: 400 }
    )
  }

  const { data: existingPerson, error: existingPersonError } = await supabase
    .from("people")
    .select("auth_user_id")
    .eq("id", body.id)
    .maybeSingle()

  if (existingPersonError) {
    console.error("Failed to check person account link:", existingPersonError)
    return NextResponse.json(
      {
        error: isPeopleSchemaError(existingPersonError)
          ? MIGRATIONS_REQUIRED_MESSAGE
          : "Não foi possível validar a pessoa.",
      },
      { status: isPeopleSchemaError(existingPersonError) ? 503 : 500 }
    )
  }
  if (!existingPerson) {
    return NextResponse.json(
      { error: "Pessoa não encontrada." },
      { status: 404 }
    )
  }
  if (!existingPerson.auth_user_id && !input.phone1) {
    return NextResponse.json(
      { error: "O telefone principal é obrigatório." },
      { status: 400 }
    )
  }

  if (existingPerson.auth_user_id) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "A sincronização de perfis não está configurada." },
        { status: 500 }
      )
    }

    const admin = createAdminClient()
    const {
      data: { user: linkedUser },
      error: linkedUserError,
    } = await admin.auth.admin.getUserById(existingPerson.auth_user_id)

    if (linkedUserError || !linkedUser) {
      console.error("Failed to load linked user profile:", linkedUserError)
      return NextResponse.json(
        { error: "Não foi possível carregar o perfil vinculado." },
        { status: 502 }
      )
    }

    const { error: profileUpdateError } = await admin.auth.admin.updateUserById(
      existingPerson.auth_user_id,
      {
        user_metadata: {
          ...linkedUser.user_metadata,
          first_name: input.first_name,
          last_name: input.last_name,
          name: `${input.first_name} ${input.last_name}`,
          ...getProfilePhoneFields(input.phone1, ""),
          ...getProfilePhoneFields(input.phone2, "2"),
          contractor: input.company,
        },
      }
    )

    if (profileUpdateError) {
      console.error("Failed to sync linked user profile:", profileUpdateError)
      return NextResponse.json(
        { error: "Não foi possível sincronizar o perfil vinculado." },
        { status: 502 }
      )
    }
  }

  const { data, error } = await supabase
    .from("people")
    .update({
      first_name: input.first_name,
      last_name: input.last_name,
      phone1: input.phone1,
      phone2: input.phone2,
      contractor: input.company,
    })
    .eq("id", body.id)
    .select(PERSON_FIELDS)
    .maybeSingle()

  if (error) {
    console.error("Failed to update shared person:", error)
    return NextResponse.json(
      {
        error: isPeopleSchemaError(error)
          ? MIGRATIONS_REQUIRED_MESSAGE
          : "Não foi possível atualizar a pessoa.",
      },
      { status: isPeopleSchemaError(error) ? 503 : 500 }
    )
  }

  if (!data) {
    return NextResponse.json(
      { error: "Pessoa não encontrada." },
      { status: 404 }
    )
  }

  return NextResponse.json({ person: data })
}

export async function DELETE(request: Request) {
  const supabase = await getAuthenticatedClient()
  if (!supabase) {
    return unauthorizedResponse()
  }

  const body: unknown = await readBody(request)
  if (!isRecord(body) || !isUuid(body.id)) {
    return NextResponse.json(
      { error: "Identificador da pessoa inválido." },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("people")
    .delete()
    .eq("id", body.id)
    .select("id")
    .maybeSingle()

  if (error) {
    console.error("Failed to delete shared person:", error)
    return NextResponse.json(
      {
        error: isPeopleSchemaError(error)
          ? MIGRATIONS_REQUIRED_MESSAGE
          : "Não foi possível excluir a pessoa.",
      },
      { status: isPeopleSchemaError(error) ? 503 : 500 }
    )
  }

  if (!data) {
    return NextResponse.json(
      { error: "Pessoa não encontrada." },
      { status: 404 }
    )
  }

  return NextResponse.json({ id: data.id })
}
