import { DashboardCalendar } from "@/components/dashboard-calendar"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarInsetContent,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import type { OperatorSchedule } from "@/lib/schedule"

type EscalaProps = {
  user: {
    name: string
    email: string
    avatar: string
  }
  operators: string[]
  schedule: OperatorSchedule
  currentDate: Date
}

export function EscalaDeOperadores({
  user,
  operators,
  schedule,
  currentDate,
}: EscalaProps) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Apoio Operacional 2027
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Escala</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <SidebarInsetContent>
          <div className="flex-1 rounded-xl bg-muted/50 py-1 md:min-h-min">
            <DashboardCalendar
              operators={operators}
              schedule={schedule}
              currentDate={currentDate}
            />
          </div>
        </SidebarInsetContent>
      </SidebarInset>
    </SidebarProvider>
  )
}
