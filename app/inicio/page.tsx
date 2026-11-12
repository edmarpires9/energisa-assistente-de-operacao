import { redirect } from "next/navigation"
import { WebhookIcon } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import Lightning from "@/components/Lightning"
import { PopularRoutes } from "@/components/popular-routes"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/server"

export default async function InicioPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/login")
  }

  const existingName =
    typeof user.user_metadata.name === "string"
      ? user.user_metadata.name.trim()
      : ""
  const firstName =
    typeof user.user_metadata.first_name === "string"
      ? user.user_metadata.first_name
      : (existingName.split(/\s+/)[0] ?? "")
  const lastName =
    typeof user.user_metadata.last_name === "string"
      ? user.user_metadata.last_name
      : existingName.split(/\s+/).slice(1).join(" ")
  const userName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    existingName ||
    user.email ||
    "Usuário"

  return (
    <SidebarProvider className="h-svh min-h-0 overflow-hidden">
      <AppSidebar
        user={{
          name: userName,
          email: user.email ?? "",
          avatar:
            typeof user.user_metadata.avatar === "string"
              ? user.user_metadata.avatar
              : "/user.png",
          firstName,
          lastName,
          ddd:
            typeof user.user_metadata.ddd === "string"
              ? user.user_metadata.ddd
              : "",
          telefone:
            typeof user.user_metadata.telefone === "string"
              ? user.user_metadata.telefone
              : "",
          ddd2:
            typeof user.user_metadata.ddd2 === "string"
              ? user.user_metadata.ddd2
              : "",
          telefone2:
            typeof user.user_metadata.telefone2 === "string"
              ? user.user_metadata.telefone2
              : "",
        }}
      />
      <SidebarInset className="min-h-0 overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-muted/50 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Início</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto px-4">
            <ThemeToggle />
          </div>
        </header>
        <main className="inicio-lightning-background relative isolate flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted/50 px-6 py-16">
          <Lightning
            bolts={0}
            branches={0.5}
            clickStrike
            className="absolute inset-0"
            color="#3b82f6"
            intro={false}
            lightMode
            mouseInteraction={false}
            speed={0.00001}
          />
          <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center overflow-y-auto px-6 py-8">
            <section className="flex w-full max-w-4xl flex-col items-center text-center">
              <div className="mb-6 flex size-20 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                <WebhookIcon aria-hidden="true" className="size-11" />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Apoio Operacional
              </h1>
              <p className="mt-3 text-base text-muted-foreground sm:text-lg">
                Seu ponto de apoio para conectar pessoas, informações e
                operações.
              </p>
              <PopularRoutes />
            </section>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
