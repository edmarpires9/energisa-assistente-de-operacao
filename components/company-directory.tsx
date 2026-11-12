"use client"

import { useCallback, useEffect, useState } from "react"
import { Building2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CompanyIcon } from "@/components/company-icon"
import { RouteHeading } from "@/components/route-heading"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  isCompanyIconName,
  type CompanyIconName,
  type GameIconOption,
} from "@/lib/company-icons"

const ICON_PAGE_SIZE = 48

type Company = {
  id: string
  name: string
  icon: CompanyIconName
  color: string
  created_by_name: string
  created_at: string
  updated_by_name: string
  updated_at: string
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

function isCompany(value: unknown): value is Company {
  return (
    value !== null &&
    typeof value === "object" &&
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "icon" in value &&
    isCompanyIconName(value.icon) &&
    "color" in value &&
    typeof value.color === "string" &&
    /^#[\da-f]{6}$/i.test(value.color) &&
    "created_by_name" in value &&
    typeof value.created_by_name === "string" &&
    "created_at" in value &&
    typeof value.created_at === "string" &&
    "updated_by_name" in value &&
    typeof value.updated_by_name === "string" &&
    "updated_at" in value &&
    typeof value.updated_at === "string"
  )
}

function isCompaniesResponse(
  value: unknown
): value is { companies: Company[] } {
  return (
    value !== null &&
    typeof value === "object" &&
    "companies" in value &&
    Array.isArray(value.companies) &&
    value.companies.every(isCompany)
  )
}

function isGameIconOption(value: unknown): value is GameIconOption {
  return (
    value !== null &&
    typeof value === "object" &&
    "id" in value &&
    isCompanyIconName(value.id) &&
    "name" in value &&
    typeof value.name === "string" &&
    "author" in value &&
    typeof value.author === "string"
  )
}

function isGameIconResponse(
  value: unknown
): value is { icons: GameIconOption[]; total: number } {
  return (
    value !== null &&
    typeof value === "object" &&
    "icons" in value &&
    Array.isArray(value.icons) &&
    value.icons.every(isGameIconOption) &&
    "total" in value &&
    typeof value.total === "number"
  )
}

function getErrorMessage(value: unknown, fallback: string) {
  return value &&
    typeof value === "object" &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : fallback
}

export function CompanyDirectory() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [mutationError, setMutationError] = useState("")
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [name, setName] = useState("")
  const [icon, setIcon] = useState<CompanyIconName>("delapouite/factory")
  const [iconSearch, setIconSearch] = useState("")
  const [iconOptions, setIconOptions] = useState<GameIconOption[]>([])
  const [iconTotal, setIconTotal] = useState(0)
  const [isLoadingIcons, setIsLoadingIcons] = useState(false)
  const [isLoadingMoreIcons, setIsLoadingMoreIcons] = useState(false)
  const [iconSearchError, setIconSearchError] = useState("")
  const [color, setColor] = useState("#000000")
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const refreshCompanies = useCallback(async () => {
    try {
      const response = await fetch("/api/companies", { cache: "no-store" })
      const payload: unknown = await response.json()

      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "Não foi possível carregar as empresas.")
        )
      }
      if (!isCompaniesResponse(payload)) {
        throw new Error("A resposta de empresas tem um formato inválido.")
      }

      setCompanies(
        [...payload.companies].sort((a, b) =>
          a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
        )
      )
      setLoadError("")
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as empresas."
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isSheetOpen) {
      return
    }

    let active = true
    const timeout = window.setTimeout(async () => {
      setIsLoadingIcons(true)
      setIconSearchError("")

      try {
        const params = new URLSearchParams({
          q: iconSearch,
          limit: String(ICON_PAGE_SIZE),
        })
        const response = await fetch(`/api/company-icons?${params}`, {
          cache: "no-store",
        })
        const payload: unknown = await response.json()

        if (!response.ok) {
          throw new Error(
            getErrorMessage(payload, "Não foi possível buscar os ícones.")
          )
        }
        if (!isGameIconResponse(payload)) {
          throw new Error("A resposta do catálogo de ícones é inválida.")
        }

        if (active) {
          setIconOptions(payload.icons)
          setIconTotal(payload.total)
        }
      } catch (error) {
        if (active) {
          setIconSearchError(
            error instanceof Error
              ? error.message
              : "Não foi possível buscar os ícones."
          )
        }
      } finally {
        if (active) {
          setIsLoadingIcons(false)
        }
      }
    }, 200)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [iconSearch, isSheetOpen])

  useEffect(() => {
    let active = true

    async function loadCompanies() {
      try {
        const response = await fetch("/api/companies", { cache: "no-store" })
        const payload: unknown = await response.json()

        if (!response.ok) {
          throw new Error(
            getErrorMessage(payload, "Não foi possível carregar as empresas.")
          )
        }
        if (!isCompaniesResponse(payload)) {
          throw new Error("A resposta de empresas tem um formato inválido.")
        }

        if (active) {
          setCompanies(
            [...payload.companies].sort((a, b) =>
              a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
            )
          )
          setLoadError("")
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar as empresas."
          )
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadCompanies()
    return () => {
      active = false
    }
  }, [])

  function openCreateForm() {
    setEditingCompany(null)
    setName("")
    setIcon("delapouite/factory")
    setIconSearch("")
    setColor("#000000")
    setMutationError("")
    setIsSheetOpen(true)
  }

  function openEditForm(company: Company) {
    setEditingCompany(company)
    setName(company.name)
    setIcon(company.icon)
    setIconSearch("")
    setColor(company.color)
    setMutationError("")
    setIsSheetOpen(true)
  }

  async function loadMoreIcons() {
    setIsLoadingMoreIcons(true)
    setIconSearchError("")

    try {
      const params = new URLSearchParams({
        q: iconSearch,
        offset: String(iconOptions.length),
        limit: String(ICON_PAGE_SIZE),
      })
      const response = await fetch(`/api/company-icons?${params}`, {
        cache: "no-store",
      })
      const payload: unknown = await response.json()

      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "Não foi possível carregar mais ícones.")
        )
      }
      if (!isGameIconResponse(payload)) {
        throw new Error("A resposta do catálogo de ícones é inválida.")
      }

      setIconOptions((current) => [...current, ...payload.icons])
      setIconTotal(payload.total)
    } catch (error) {
      setIconSearchError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar mais ícones."
      )
    } finally {
      setIsLoadingMoreIcons(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMutationError("")
    setIsSaving(true)

    try {
      const response = await fetch("/api/companies", {
        method: editingCompany ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingCompany ? { id: editingCompany.id } : {}),
          name,
          icon,
          color,
        }),
      })
      const payload: unknown = await response.json()

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            payload,
            editingCompany
              ? "Não foi possível atualizar a empresa."
              : "Não foi possível cadastrar a empresa."
          )
        )
      }

      setIsSheetOpen(false)
      await refreshCompanies()
    } catch (error) {
      setMutationError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a empresa."
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(company: Company) {
    if (
      !window.confirm(
        `Excluir ${company.name} da lista? Os contatos existentes manterão o texto já cadastrado.`
      )
    ) {
      return
    }

    setMutationError("")
    setDeletingId(company.id)
    try {
      const response = await fetch("/api/companies", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: company.id }),
      })
      const payload: unknown = await response.json()

      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "Não foi possível excluir a empresa.")
        )
      }

      await refreshCompanies()
    } catch (error) {
      setMutationError(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a empresa."
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-4 border-b px-6 py-5">
        <RouteHeading icon={Building2Icon} title="Empresas" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            Gerencie as opções de empresa disponíveis no cadastro de contatos.
          </p>
          <Button className="sm:ml-auto" onClick={openCreateForm}>
            <PlusIcon />
            Cadastrar empresa
          </Button>
        </div>
      </div>
      {mutationError && (
        <p role="alert" className="mx-6 mt-4 text-sm text-destructive">
          {mutationError}
        </p>
      )}
      {loadError ? (
        <p role="alert" className="p-6 text-sm text-destructive">
          {loadError}
        </p>
      ) : isLoading ? (
        <p className="p-6 text-sm text-muted-foreground">
          Carregando empresas...
        </p>
      ) : companies.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <CompanyIcon
            icon="delapouite/factory"
            color="#000000"
            className="size-10"
          />
          <h2 className="font-medium">Nenhuma empresa cadastrada</h2>
          <p className="text-sm text-muted-foreground">
            Cadastre uma empresa para disponibilizá-la no formulário de
            contatos.
          </p>
          <Button onClick={openCreateForm}>
            <PlusIcon />
            Cadastrar empresa
          </Button>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto px-6 pb-8">
          <div className="divide-y">
            {companies.map((company) => (
              <article
                key={company.id}
                className="flex items-center gap-3 py-4"
              >
                <CompanyIcon icon={company.icon} color={company.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{company.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cadastrada por {company.created_by_name} ·{" "}
                    {formatDate(company.created_at)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Atualizada por {company.updated_by_name} ·{" "}
                    {formatDate(company.updated_at)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Editar ${company.name}`}
                  onClick={() => openEditForm(company)}
                >
                  <PencilIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Excluir ${company.name}`}
                  disabled={deletingId === company.id}
                  onClick={() => void handleDelete(company)}
                >
                  <Trash2Icon className="text-destructive" />
                </Button>
              </article>
            ))}
          </div>
        </div>
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="gap-0 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingCompany ? "Editar empresa" : "Cadastrar empresa"}
            </SheetTitle>
            <SheetDescription>
              A lista fica disponível para todos os usuários autenticados.
            </SheetDescription>
          </SheetHeader>
          <form
            className="flex flex-col gap-5 px-6 pb-6"
            onSubmit={handleSubmit}
          >
            <Field>
              <FieldLabel htmlFor="company-name">Nome da empresa</FieldLabel>
              <Input
                id="company-name"
                name="name"
                autoComplete="organization"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={150}
              />
            </Field>
            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm leading-none font-medium">
                Ícone
              </legend>
              <Input
                type="search"
                aria-label="Buscar ícone por nome ou autor"
                placeholder="Buscar entre 4.180 ícones..."
                value={iconSearch}
                onChange={(event) => setIconSearch(event.target.value)}
              />
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {isLoadingIcons
                  ? "Buscando ícones..."
                  : `${iconTotal.toLocaleString("pt-BR")} ícones encontrados`}
              </p>
              <div
                role="radiogroup"
                aria-label="Ícones Game-icons.net"
                className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto rounded-md border p-2 sm:grid-cols-6"
              >
                {iconOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={icon === option.id}
                    aria-label={`${option.name}, por ${option.author}`}
                    title={`${option.name} — ${option.author}`}
                    onClick={() => setIcon(option.id)}
                    className={`flex min-w-0 flex-col items-center gap-1 rounded-md border p-2 text-center text-[10px] hover:bg-accent ${
                      icon === option.id
                        ? "border-primary bg-accent"
                        : "border-border"
                    }`}
                  >
                    <CompanyIcon
                      icon={option.id}
                      color={color}
                      className="size-9"
                    />
                    <span className="w-full truncate">{option.name}</span>
                  </button>
                ))}
                {!isLoadingIcons && iconOptions.length === 0 && (
                  <p className="col-span-full p-3 text-center text-sm text-muted-foreground">
                    Nenhum ícone encontrado.
                  </p>
                )}
              </div>
              {iconOptions.length < iconTotal && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadMoreIcons()}
                  disabled={isLoadingIcons || isLoadingMoreIcons}
                >
                  {isLoadingMoreIcons
                    ? "Carregando..."
                    : "Carregar mais ícones"}
                </Button>
              )}
              {iconSearchError && (
                <p role="alert" className="text-sm text-destructive">
                  {iconSearchError}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Ícone selecionado por{" "}
                {iconOptions.find((option) => option.id === icon)?.author ??
                  icon.split("/")[0]}
                .{" "}
                <a
                  href="https://game-icons.net/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  Game-icons.net
                </a>{" "}
                (CC BY 3.0; alguns autores indicam CC0). Veja os créditos em
                public/game-icons.net.svg/icons/license.txt.
              </p>
            </fieldset>
            <Field>
              <FieldLabel htmlFor="company-color">Cor da empresa</FieldLabel>
              <div className="flex items-center gap-3">
                <Input
                  id="company-color"
                  name="color"
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="h-10 w-14 cursor-pointer p-1"
                />
                <span className="text-sm text-muted-foreground">{color}</span>
              </div>
            </Field>
            {mutationError && (
              <p role="alert" className="text-sm text-destructive">
                {mutationError}
              </p>
            )}
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? "Salvando..."
                : editingCompany
                  ? "Salvar alterações"
                  : "Cadastrar empresa"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
