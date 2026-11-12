import Image from "next/image"
import { Building2Icon } from "lucide-react"

import { isCompanyIconName } from "@/lib/company-icons"

export function CompanyIcon({
  icon,
  color,
  className = "size-8",
  iconClassName = "size-5",
  loading,
}: {
  icon: string
  color: string
  className?: string
  iconClassName?: string
  loading?: "eager" | "lazy"
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md ${className}`}
      style={{ backgroundColor: color }}
    >
      {isCompanyIconName(icon) ? (
        <Image
          src={`/game-icons.net.svg/icons/ffffff/transparent/1x1/${icon}.svg`}
          alt=""
          aria-hidden="true"
          width={24}
          height={24}
          loading={loading}
          className={iconClassName}
        />
      ) : (
        <Building2Icon aria-hidden="true" className="size-5 text-white" />
      )}
    </span>
  )
}
