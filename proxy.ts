import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseConfig } from "@/lib/supabase/config"

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/login") {
    const sanitizedUrl = request.nextUrl.clone()
    const sensitiveParams = [...sanitizedUrl.searchParams.keys()].filter(
      (name) => ["email", "password"].includes(name.toLowerCase())
    )

    if (sensitiveParams.length > 0) {
      sensitiveParams.forEach((name) => sanitizedUrl.searchParams.delete(name))
      return NextResponse.redirect(sanitizedUrl)
    }
  }

  let supabaseResponse = NextResponse.next({ request })
  const { url, publishableKey } = getSupabaseConfig()
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
        Object.entries(headers).forEach(([name, value]) => {
          supabaseResponse.headers.set(name, value)
        })
      },
    },
  })

  const { data, error } = await supabase.auth.getClaims()
  const isAuthenticated =
    !error && data !== null && typeof data.claims?.sub === "string"
  const pathname = request.nextUrl.pathname
  const publicRoutes = new Set(["/", "/login", "/signup", "/auth/callback"])
  const authRoutes = new Set(["/login", "/signup"])

  let redirectPath: string | null = null

  if (!isAuthenticated && !publicRoutes.has(pathname)) {
    redirectPath = "/login"
  } else if (isAuthenticated && authRoutes.has(pathname)) {
    redirectPath = "/EscalaCOD"
  }

  if (!redirectPath) {
    return supabaseResponse
  }

  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = redirectPath
  const redirectResponse = NextResponse.redirect(redirectUrl)
  supabaseResponse.cookies
    .getAll()
    .forEach((cookie) => redirectResponse.cookies.set(cookie))

  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = supabaseResponse.headers.get(header)
    if (value) {
      redirectResponse.headers.set(header, value)
    }
  }

  return redirectResponse
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
