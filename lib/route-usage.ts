export const TRACKED_ROUTES = [
  { path: "/inicio", name: "Início" },
  { path: "/EscalaCOD", name: "Escala" },
  { path: "/usuarios", name: "Usuários" },
  { path: "/contatos", name: "Contatos" },
] as const

export type TrackedRoute = (typeof TRACKED_ROUTES)[number]["path"]

export function isTrackedRoute(path: unknown): path is TrackedRoute {
  return (
    typeof path === "string" &&
    TRACKED_ROUTES.some((route) => route.path === path)
  )
}
