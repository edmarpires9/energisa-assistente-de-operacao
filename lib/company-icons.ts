export type CompanyIconName = string
export type GameIconOption = {
  id: CompanyIconName
  name: string
  author: string
}

export function isCompanyIconName(value: unknown): value is CompanyIconName {
  return typeof value === "string" && /^[a-z0-9-]+\/[a-z0-9-]+$/.test(value)
}
