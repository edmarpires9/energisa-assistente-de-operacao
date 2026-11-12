"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

import { isTrackedRoute } from "@/lib/route-usage"

export function RouteUsageTracker() {
  const pathname = usePathname()
  const lastTrackedPath = useRef<string | null>(null)

  useEffect(() => {
    if (!isTrackedRoute(pathname) || lastTrackedPath.current === pathname) {
      return
    }

    lastTrackedPath.current = pathname

    void fetch("/api/route-usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload: unknown = await response.json()
          throw new Error(
            payload !== null &&
              typeof payload === "object" &&
              "error" in payload &&
              typeof payload.error === "string"
              ? payload.error
              : "Não foi possível registrar o acesso à página."
          )
        }
        window.dispatchEvent(new Event("route-usage-updated"))
      })
      .catch((error: unknown) => {
        console.error("Failed to record route visit:", error)
      })
  }, [pathname])

  return null
}
