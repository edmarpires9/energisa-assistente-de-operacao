import "server-only"

import iconCatalog from "@/lib/game-icon-catalog.json"
import type { GameIconOption } from "@/lib/company-icons"

const icons: GameIconOption[] = iconCatalog
const iconsById = new Map(icons.map((icon) => [icon.id, icon]))

export function isCatalogCompanyIconName(value: unknown): value is string {
  return typeof value === "string" && iconsById.has(value)
}

export function searchGameIcons(
  searchTerms: string[],
  offset: number,
  limit: number
) {
  const matchingIcons = searchTerms.length
    ? icons.filter((icon) => {
        const searchableText = `${icon.name} ${icon.author} ${icon.id}`
          .toLocaleLowerCase("pt-BR")
          .replaceAll("-", " ")
        return searchTerms.every((term) => searchableText.includes(term))
      })
    : icons

  return {
    icons: matchingIcons.slice(offset, offset + limit),
    total: matchingIcons.length,
  }
}
