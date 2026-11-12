import { NextResponse } from "next/server"

import { isCatalogCompanyIconName } from "@/lib/company-icon-catalog"
import { createClient } from "@/lib/supabase/server"

const MIGRATIONS_REQUIRED_MESSAGE =
  "O banco ainda não está configurado para empresas. Execute as migrations 20261111000200_create_companies.sql, 20261111000300_add_company_audit.sql, 20261111000400_add_company_icon_and_color.sql e 20261111000500_use_full_game_icon_catalog.sql, nessa ordem, no SQL Editor do Supabase."

const COMPANY_FIELDS =
  "id, name, icon, color, created_by_name, created_at, updated_by_name, updated_at"

const DEFAULT_COMPANY_COLOR = "#000000"

function isCompanyColor(value: unknown): value is string {
  return typeof value === "string" && /^#[\da-f]{6}$/i.test(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isSchemaError(error: { code?: string }) {
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

async function getAuthenticatedClient() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  return error || !user ? null : supabase
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

function getDatabaseErrorResponse(
  error: { code?: string },
  operation: string,
  fallback: string
) {
  console.error(`Failed to ${operation} company:`, error)
  return NextResponse.json(
    {
      error: isSchemaError(error) ? MIGRATIONS_REQUIRED_MESSAGE : fallback,
    },
    { status: isSchemaError(error) ? 503 : 500 }
  )
}

export async function GET() {
  const supabase = await getAuthenticatedClient()
  if (!supabase) {
    return unauthorizedResponse()
  }

  const { data, error } = await supabase
    .from("companies")
    .select(COMPANY_FIELDS)
    .order("name", { ascending: true })

  if (error) {
    return getDatabaseErrorResponse(
      error,
      "load",
      "Não foi possível carregar as empresas."
    )
  }

  return NextResponse.json(
    { companies: data },
    { headers: { "Cache-Control": "no-store" } }
  )
}

export async function POST(request: Request) {
  const supabase = await getAuthenticatedClient()
  if (!supabase) {
    return unauthorizedResponse()
  }

  const body: unknown = await readBody(request)
  const name =
    isRecord(body) && typeof body.name === "string" ? body.name.trim() : ""
  const icon =
    isRecord(body) && body.icon !== undefined ? body.icon : "delapouite/factory"
  const color =
    isRecord(body) && body.color !== undefined
      ? body.color
      : DEFAULT_COMPANY_COLOR
  if (!name || name.length > 150) {
    return NextResponse.json(
      { error: "Informe um nome de empresa com até 150 caracteres." },
      { status: 400 }
    )
  }
  if (!isCatalogCompanyIconName(icon) || !isCompanyColor(color)) {
    return NextResponse.json(
      { error: "Selecione um ícone e uma cor válidos para a empresa." },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("companies")
    .insert({ name, icon, color })
    .select(COMPANY_FIELDS)
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Já existe uma empresa com esse nome." },
        { status: 409 }
      )
    }
    return getDatabaseErrorResponse(
      error,
      "create",
      "Não foi possível cadastrar a empresa."
    )
  }

  return NextResponse.json({ company: data }, { status: 201 })
}

export async function PATCH(request: Request) {
  const supabase = await getAuthenticatedClient()
  if (!supabase) {
    return unauthorizedResponse()
  }

  const body: unknown = await readBody(request)
  if (!isRecord(body) || !isUuid(body.id)) {
    return NextResponse.json(
      { error: "Identificador da empresa inválido." },
      { status: 400 }
    )
  }
  const name = typeof body.name === "string" ? body.name.trim() : ""
  if (!name || name.length > 150) {
    return NextResponse.json(
      { error: "Informe um nome de empresa com até 150 caracteres." },
      { status: 400 }
    )
  }

  const updates: { name: string; icon?: string; color?: string } = { name }
  if (body.icon !== undefined) {
    if (!isCatalogCompanyIconName(body.icon)) {
      return NextResponse.json(
        { error: "Selecione um ícone válido para a empresa." },
        { status: 400 }
      )
    }
    updates.icon = body.icon
  }
  if (body.color !== undefined) {
    if (!isCompanyColor(body.color)) {
      return NextResponse.json(
        { error: "Selecione uma cor válida para a empresa." },
        { status: 400 }
      )
    }
    updates.color = body.color
  }

  const { data, error } = await supabase
    .from("companies")
    .update(updates)
    .eq("id", body.id)
    .select(COMPANY_FIELDS)
    .maybeSingle()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Já existe uma empresa com esse nome." },
        { status: 409 }
      )
    }
    return getDatabaseErrorResponse(
      error,
      "update",
      "Não foi possível atualizar a empresa."
    )
  }
  if (!data) {
    return NextResponse.json(
      { error: "Empresa não encontrada." },
      { status: 404 }
    )
  }

  return NextResponse.json({ company: data })
}

export async function DELETE(request: Request) {
  const supabase = await getAuthenticatedClient()
  if (!supabase) {
    return unauthorizedResponse()
  }

  const body: unknown = await readBody(request)
  if (!isRecord(body) || !isUuid(body.id)) {
    return NextResponse.json(
      { error: "Identificador da empresa inválido." },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("companies")
    .delete()
    .eq("id", body.id)
    .select("id")
    .maybeSingle()

  if (error) {
    return getDatabaseErrorResponse(
      error,
      "delete",
      "Não foi possível excluir a empresa."
    )
  }
  if (!data) {
    return NextResponse.json(
      { error: "Empresa não encontrada." },
      { status: 404 }
    )
  }

  return NextResponse.json({ id: data.id })
}
