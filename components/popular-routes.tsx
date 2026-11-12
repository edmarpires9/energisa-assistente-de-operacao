"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  CalendarDaysIcon,
  ContactRoundIcon,
  HouseIcon,
  UsersRoundIcon,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import { TRACKED_ROUTES, type TrackedRoute } from "@/lib/route-usage"

type RouteVisit = {
  path: TrackedRoute
  visits: number
}

type RouteVisitsResponse = {
  routes: RouteVisit[]
}

const routeIcons = {
  "/inicio": HouseIcon,
  "/EscalaCOD": CalendarDaysIcon,
  "/usuarios": UsersRoundIcon,
  "/contatos": ContactRoundIcon,
} satisfies Record<TrackedRoute, typeof HouseIcon>

function isRouteVisitsResponse(value: unknown): value is RouteVisitsResponse {
  return (
    value !== null &&
    typeof value === "object" &&
    "routes" in value &&
    Array.isArray(value.routes) &&
    value.routes.every(
      (route) =>
        route !== null &&
        typeof route === "object" &&
        "path" in route &&
        TRACKED_ROUTES.some((knownRoute) => knownRoute.path === route.path) &&
        "visits" in route &&
        typeof route.visits === "number" &&
        Number.isSafeInteger(route.visits) &&
        route.visits >= 0
    )
  )
}

export function PopularRoutes() {
  const [routes, setRoutes] = useState<RouteVisit[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    async function loadRoutes() {
      try {
        const response = await fetch("/api/route-usage", {
          cache: "no-store",
        })
        const payload: unknown = await response.json()

        if (!response.ok) {
          const message =
            payload !== null &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof payload.error === "string"
              ? payload.error
              : "Não foi possível carregar as rotas mais acessadas."
          throw new Error(message)
        }
        if (!isRouteVisitsResponse(payload)) {
          throw new Error("A resposta de rotas mais acessadas é inválida.")
        }

        if (active) {
          setRoutes(payload.routes)
          setError("")
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Não foi possível carregar as rotas mais acessadas."
          )
        }
      }
    }

    function handleRouteUsageUpdated() {
      void loadRoutes()
    }

    window.addEventListener("route-usage-updated", handleRouteUsageUpdated)
    void loadRoutes()

    return () => {
      active = false
      window.removeEventListener("route-usage-updated", handleRouteUsageUpdated)
    }
  }, [])

  const sortedRoutes = [...routes].sort(
    (first, second) =>
      second.visits - first.visits ||
      TRACKED_ROUTES.findIndex((route) => route.path === first.path) -
        TRACKED_ROUTES.findIndex((route) => route.path === second.path)
  )

  return (
    <section className="pointer-events-auto mt-8 w-full">
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">
        Mais acessados pela equipe
      </h2>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {sortedRoutes.map((route) => {
            const metadata = TRACKED_ROUTES.find(
              (knownRoute) => knownRoute.path === route.path
            )
            const Icon = routeIcons[route.path]

            return (
              <Link
                key={route.path}
                href={route.path}
                className="rounded-4xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card
                  size="sm"
                  className="h-full transition-colors hover:bg-accent"
                >
                  <CardContent className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0 text-left">
                      <CardTitle className="truncate">
                        {metadata?.name ?? route.path}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {route.visits}{" "}
                        {route.visits === 1 ? "acesso" : "acessos"}
                      </CardDescription>
                    </span>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
