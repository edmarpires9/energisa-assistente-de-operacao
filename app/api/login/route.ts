import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const formData = await request.formData()
  const email = formData.get("email")
  const password = formData.get("password")

  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    return redirectToLogin()
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })

  if (error) {
    return redirectToLogin()
  }

  if (!data.session) {
    return redirectToLogin()
  }

  return redirectToPath("/inicio")
}

function redirectToLogin() {
  return redirectToPath("/login?authError=login")
}

function redirectToPath(path: string) {
  return new Response(null, {
    status: 303,
    headers: { Location: path },
  })
}
