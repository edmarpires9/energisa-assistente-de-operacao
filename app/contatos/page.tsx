import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { PeopleDirectory } from "@/components/people-directory"
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

export default async function PeoplePage() {
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
  const avatar =
    typeof user.user_metadata.avatar === "string"
      ? user.user_metadata.avatar
      : "/user.png"

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          name: userName,
          email: user.email ?? "",
          avatar,
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
      <SidebarInset>
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
                  <BreadcrumbPage>Contatos</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto px-4">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col bg-muted/50">
          <PeopleDirectory />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
