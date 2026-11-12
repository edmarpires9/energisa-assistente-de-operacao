import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  isTrackedRoute,
  TRACKED_ROUTES,
  type TrackedRoute,
} from "@/lib/route-usage"

const MIGRATIONS_REQUIRED_MESSAGE =
  "As estatísticas de rotas não estão atualizadas. Execute as migrations 20261111000100_create_route_usage.sql e 20261111000700_lowercase_users_route.sql no SQL Editor do Supabase."

function isRouteUsageSchemaError(error: { code?: string }) {
  return (
    error.code === "PGRST202" ||
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.code === "42883" ||
    error.code === "22023"
  )
}

function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Autenticação necessária." },
    { status: 401, headers: { "Cache-Control": "no-store" } }
  )
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return unauthorizedResponse()
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "O serviço de estatísticas não está configurado." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("route_usage")
    .select("path, visit_count")

  if (error) {
    console.error("Failed to load route usage:", error)
    return NextResponse.json(
      {
        error: isRouteUsageSchemaError(error)
          ? MIGRATIONS_REQUIRED_MESSAGE
          : "Não foi possível carregar as rotas mais acessadas.",
      },
      {
        status: isRouteUsageSchemaError(error) ? 503 : 500,
        headers: { "Cache-Control": "no-store" },
      }
    )
  }

  const visits = new Map<TrackedRoute, number>()
  for (const record of data) {
    if (isTrackedRoute(record.path)) {
      visits.set(record.path, Number(record.visit_count))
    }
  }
  const routes = TRACKED_ROUTES.map(({ path }) => ({
    path,
    visits: visits.get(path) ?? 0,
  })).sort((first, second) => second.visits - first.visits)

  return NextResponse.json(
    { routes },
    { headers: { "Cache-Control": "no-store" } }
  )
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return unauthorizedResponse()
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "O corpo da requisição deve ser JSON válido." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    )
  }

  const path =
    body !== null && typeof body === "object" && "path" in body
      ? body.path
      : null
  if (!isTrackedRoute(path)) {
    return NextResponse.json(
      { error: "Rota inválida para registro de acesso." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    )
  }

  const { error } = await supabase.rpc("increment_route_usage", {
    p_path: path,
  })

  if (error) {
    console.error("Failed to record route usage:", error)
    return NextResponse.json(
      {
        error: isRouteUsageSchemaError(error)
          ? MIGRATIONS_REQUIRED_MESSAGE
          : "Não foi possível registrar o acesso à página.",
      },
      {
        status: isRouteUsageSchemaError(error) ? 503 : 500,
        headers: { "Cache-Control": "no-store" },
      }
    )
  }

  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  })
}
