import { isCompanyIconName, type CompanyIconName } from "@/lib/company-icons"

const PROFILE_AVATAR_PREFIX = "game-icon:"

export function createProfileAvatar(icon: CompanyIconName, color: string) {
  return `${PROFILE_AVATAR_PREFIX}${icon}:${color}`
}

export function parseProfileAvatar(value: string) {
  if (!value.startsWith(PROFILE_AVATAR_PREFIX)) {
    return null
  }

  const [icon, color] = value.slice(PROFILE_AVATAR_PREFIX.length).split(":")
  if (
    !isCompanyIconName(icon) ||
    typeof color !== "string" ||
    !/^#[\da-f]{6}$/i.test(color)
  ) {
    return null
  }

  return { icon, color }
}
