"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  GalleryVerticalEndIcon,
  AudioLinesIcon,
  TerminalIcon,
  TerminalSquareIcon,
  BotIcon,
  BookOpenIcon,
  Settings2Icon,
  FrameIcon,
  PieChartIcon,
  MapIcon,
  Eclipse,
  EclipseIcon,
  NavigationIcon,
  HexagonIcon,
  Rows3Icon,
  MapPinnedIcon,
  CalendarDaysIcon,
  PhoneIncomingIcon,
  PackageIcon,
  Terminal,
  WebhookIcon,
} from "lucide-react"

// This is sample data.
const data = {
  teams: [
    {
      name: "Apoio Operacional",
      logo: <WebhookIcon />,
      plan: `${new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(new Date())}/${new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date())}`,
    },
    // {
    //   name: "SIGOD 2027",
    //   logo: (
    //     <EclipseIcon/>
    //   ),
    //   plan: "O melhor do brasil",
    // },
    // {
    //   name: "NR 2027",
    //   logo: (
    //     <TerminalIcon
    //     />
    //   ),
    //   plan: "Sistema técnico alternativo",
    // },
    // {
    //   name: "Mapa",
    //   logo: (
    //     <MapPinnedIcon
    //     />
    //   ),
    //   plan: "Free",
    // },
    // {
    //   name: "Contatos",
    //   logo: (
    //     <PhoneIncomingIcon
    //     />
    //   ),
    //   plan: "Free",
    // },
  ],
  navMain: [
    // {
    //   title: "Playground",
    //   url: "#",
    //   icon: (
    //     <TerminalSquareIcon
    //     />
    //   ),
    //   isActive: true,
    //   items: [
    //     {
    //       title: "History",
    //       url: "#",
    //     },
    //     {
    //       title: "Starred",
    //       url: "#",
    //     },
    //     {
    //       title: "Settings",
    //       url: "#",
    //     },
    //   ],
    // },
    // {
    //   title: "Models",
    //   url: "#",
    //   icon: (
    //     <BotIcon
    //     />
    //   ),
    //   items: [
    //     {
    //       title: "Genesis",
    //       url: "#",
    //     },
    //     {
    //       title: "Explorer",
    //       url: "#",
    //     },
    //     {
    //       title: "Quantum",
    //       url: "#",
    //     },
    //   ],
    // },
    // {
    //   title: "Documentation",
    //   url: "#",
    //   icon: (
    //     <BookOpenIcon
    //     />
    //   ),
    //   items: [
    //     {
    //       title: "Introduction",
    //       url: "#",
    //     },
    //     {
    //       title: "Get Started",
    //       url: "#",
    //     },
    //     {
    //       title: "Tutorials",
    //       url: "#",
    //     },
    //     {
    //       title: "Changelog",
    //       url: "#",
    //     },
    //   ],
    // },
    // {
    //   title: "Settings",
    //   url: "#",
    //   icon: (
    //     <Settings2Icon
    //     />
    //   ),
    //   items: [
    //     {
    //       title: "General",
    //       url: "#",
    //     },
    //     {
    //       title: "Team",
    //       url: "#",
    //     },
    //     {
    //       title: "Billing",
    //       url: "#",
    //     },
    //     {
    //       title: "Limits",
    //       url: "#",
    //     },
    //   ],
    // },
  ],
  projects: [
    // {
    //   name: "Design Engineering",
    //   url: "#",
    //   icon: (
    //     <FrameIcon
    //     />
    //   ),
    // },
    // {
    //   name: "Sales & Marketing",
    //   url: "#",
    //   icon: (
    //     <PieChartIcon
    //     />
    //   ),
    // },
    // {
    //   name: "Travel",
    //   url: "#",
    //   icon: (
    //     <MapIcon
    //     />
    //   ),
    // },
  ],
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string
    email: string
    avatar: string
    firstName?: string
    lastName?: string
    ddd?: string
    telefone?: string
    ddd2?: string
    telefone2?: string
  }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
