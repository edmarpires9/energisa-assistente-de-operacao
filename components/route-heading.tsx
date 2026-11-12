import type { LucideIcon } from "lucide-react"

export function RouteHeading({
  icon: Icon,
  title,
}: {
  icon: LucideIcon
  title: string
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon
        aria-hidden="true"
        className="size-10 text-green-600 dark:text-green-400"
      />
      <h1 className="text-3xl font-semibold uppercase tracking-wider">
        {title}
      </h1>
    </div>
  )
}
