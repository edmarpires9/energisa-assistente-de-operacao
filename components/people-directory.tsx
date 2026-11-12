"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Building2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ContactRoundIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react"
import Link from "next/link"

import { CompanyIcon } from "@/components/company-icon"
import { RouteHeading } from "@/components/route-heading"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { isCompanyIconName, type CompanyIconName } from "@/lib/company-icons"

type Person = {
  id: string
  auth_user_id: string | null
  first_name: string
  last_name: string
  phone1: string | null
  phone2: string | null
  company: string
  created_by_name: string
  created_at: string
  updated_by_name: string
  updated_at: string
}

type Company = {
  id: string
  name: string
  icon: CompanyIconName
  color: string
}

type PersonForm = {
  first_name: string
  last_name: string
  phone1: string
  phone2: string
  company: string
}

const CURRENT_COMPANY = "current-company"
const PEOPLE_PER_PAGE = 5

const EMPTY_FORM: PersonForm = {
  first_name: "",
  last_name: "",
  phone1: "",
  phone2: "",
  company: "",
}

function isPerson(value: unknown): value is Person {
  if (!value || typeof value !== "object") {
    return false
  }

  return (
    "id" in value &&
    typeof value.id === "string" &&
    "auth_user_id" in value &&
    (typeof value.auth_user_id === "string" || value.auth_user_id === null) &&
    "first_name" in value &&
    typeof value.first_name === "string" &&
    "last_name" in value &&
    typeof value.last_name === "string" &&
    "phone1" in value &&
    (typeof value.phone1 === "string" || value.phone1 === null) &&
    "phone2" in value &&
    (typeof value.phone2 === "string" || value.phone2 === null) &&
    "company" in value &&
    typeof value.company === "string" &&
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

function isPeopleResponse(value: unknown): value is { people: Person[] } {
  if (
    value === null ||
    typeof value !== "object" ||
    !("people" in value) ||
    !Array.isArray(value.people)
  ) {
    return false
  }

  return value.people.every(isPerson)
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
    /^#[\da-f]{6}$/i.test(value.color)
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

function getErrorMessage(payload: unknown, fallback: string) {
  return payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
    ? payload.error
    : fallback
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "")
  const national =
    digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits

  if (national.length === 10) {
    return `(${national.slice(0, 2)}) ${national.slice(2, 6)}-${national.slice(6)}`
  }
  if (national.length === 11) {
    return `(${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7)}`
  }

  return phone
}

function getPhoneHref(phone: string) {
  const digits = phone.replace(/\D/g, "")
  const international = digits.length <= 11 ? `55${digits}` : digits
  return `https://web.whatsapp.com/send?phone=${international}`
}

function getInitials(person: Person) {
  return `${person.first_name.charAt(0)}${person.last_name.charAt(0)}`.toLocaleUpperCase(
    "pt-BR"
  )
}

function normalizeCompanyName(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}]/gu, "")
}

function findCompany(personCompany: string, companies: Company[]) {
  const normalizedName = normalizeCompanyName(personCompany)
  if (!normalizedName) {
    return undefined
  }

  const exactMatch = companies.find(
    (company) => normalizeCompanyName(company.name) === normalizedName
  )
  if (exactMatch) {
    return exactMatch
  }

  const partialMatches = companies.filter((company) => {
    const companyName = normalizeCompanyName(company.name)
    return (
      companyName.startsWith(normalizedName) ||
      normalizedName.startsWith(companyName)
    )
  })

  return partialMatches.length === 1 ? partialMatches[0] : undefined
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR")
}

export function PeopleDirectory() {
  const [people, setPeople] = useState<Person[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [companyLoadError, setCompanyLoadError] = useState("")
  const [mutationError, setMutationError] = useState("")
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [form, setForm] = useState<PersonForm>(EMPTY_FORM)
  const [companySelection, setCompanySelection] = useState("")
  const [companySearch, setCompanySearch] = useState("")
  const [companyCreateError, setCompanyCreateError] = useState("")
  const [isCreatingCompany, setIsCreatingCompany] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const refreshPeople = useCallback(async () => {
    try {
      const response = await fetch("/api/contacts", { cache: "no-store" })
      const payload: unknown = await response.json()

      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "Não foi possível carregar as pessoas.")
        )
      }
      if (!isPeopleResponse(payload)) {
        throw new Error("A resposta de pessoas tem um formato inválido.")
      }

      setError("")
      setPeople(payload.people)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar as pessoas."
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

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
          setCompanyLoadError("")
        }
      } catch (loadError) {
        if (active) {
          setCompanyLoadError(
            loadError instanceof Error
              ? loadError.message
              : "Não foi possível carregar as empresas."
          )
        }
      }
    }

    void loadCompanies()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadPeople() {
      try {
        const response = await fetch("/api/contacts", { cache: "no-store" })
        const payload: unknown = await response.json()

        if (!response.ok) {
          throw new Error(
            getErrorMessage(payload, "Não foi possível carregar as pessoas.")
          )
        }
        if (!isPeopleResponse(payload)) {
          throw new Error("A resposta de pessoas tem um formato inválido.")
        }

        if (active) {
          setError("")
          setPeople(payload.people)
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Não foi possível carregar as pessoas."
          )
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadPeople()
    return () => {
      active = false
    }
  }, [])

  function openCreateForm() {
    setEditingPerson(null)
    setForm(EMPTY_FORM)
    setCompanySelection("")
    setCompanySearch("")
    setCompanyCreateError("")
    setMutationError("")
    setIsSheetOpen(true)
  }

  function openEditForm(person: Person) {
    const savedCompany = companies.find(
      (company) =>
        company.name.toLocaleLowerCase("pt-BR") ===
        person.company.trim().toLocaleLowerCase("pt-BR")
    )
    setEditingPerson(person)
    setForm({
      first_name: person.first_name,
      last_name: person.last_name,
      phone1: person.phone1 ?? "",
      phone2: person.phone2 ?? "",
      company: person.company,
    })
    setCompanySelection(savedCompany?.id ?? CURRENT_COMPANY)
    setCompanySearch(savedCompany?.name ?? "")
    setCompanyCreateError("")
    setMutationError("")
    setIsSheetOpen(true)
  }

  async function handleCreateCompany() {
    const name = companySearch.trim()
    if (!name) {
      return
    }

    setCompanyCreateError("")
    setIsCreatingCompany(true)
    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const payload: unknown = await response.json()

      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "Não foi possível cadastrar a empresa.")
        )
      }
      if (
        payload === null ||
        typeof payload !== "object" ||
        !("company" in payload) ||
        !isCompany(payload.company)
      ) {
        throw new Error("A resposta da empresa cadastrada é inválida.")
      }

      const createdCompany = payload.company
      setCompanies((current) =>
        [
          ...current.filter((company) => company.id !== createdCompany.id),
          createdCompany,
        ].sort((a, b) =>
          a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
        )
      )
      setCompanySelection(createdCompany.id)
      setForm((current) => ({ ...current, company: createdCompany.name }))
      setCompanySearch(createdCompany.name)
    } catch (error) {
      setCompanyCreateError(
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar a empresa."
      )
    } finally {
      setIsCreatingCompany(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMutationError("")
    if (
      !companies.some((company) => company.id === companySelection) &&
      companySelection !== CURRENT_COMPANY
    ) {
      setMutationError("Busque e selecione uma empresa ou cadastre uma nova.")
      return
    }
    setIsSaving(true)

    try {
      const response = await fetch("/api/contacts", {
        method: editingPerson ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingPerson ? { id: editingPerson.id } : {}),
          ...form,
          company:
            companies.find((company) => company.id === companySelection)
              ?.name ??
            (companySelection === CURRENT_COMPANY ? form.company : ""),
        }),
      })
      const payload: unknown = await response.json()

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            payload,
            editingPerson
              ? "Não foi possível atualizar a pessoa."
              : "Não foi possível cadastrar a pessoa."
          )
        )
      }

      setIsSheetOpen(false)
      await refreshPeople()
    } catch (saveError) {
      setMutationError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar a pessoa."
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(person: Person) {
    const fullName = `${person.first_name} ${person.last_name}`
    if (!window.confirm(`Apagar o contato de ${fullName}?`)) {
      return
    }

    setMutationError("")
    setDeletingId(person.id)
    try {
      const response = await fetch("/api/contacts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: person.id }),
      })
      const payload: unknown = await response.json()

      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "Não foi possível apagar a pessoa.")
        )
      }

      await refreshPeople()
    } catch (deleteError) {
      setMutationError(
        deleteError instanceof Error
          ? deleteError.message
          : "Não foi possível apagar a pessoa."
      )
    } finally {
      setDeletingId(null)
    }
  }

  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR")
  const searchTerms = normalizedSearch.split(/\s+/).filter(Boolean)
  const normalizedCompanySearch = companySearch
    .trim()
    .toLocaleLowerCase("pt-BR")
  const filteredCompanies = companies.filter((company) =>
    company.name.toLocaleLowerCase("pt-BR").includes(normalizedCompanySearch)
  )
  const hasLegacyCompany =
    companySelection === CURRENT_COMPANY &&
    !companies.some((company) => company.name === form.company)
  const showLegacyCompany =
    hasLegacyCompany &&
    form.company.toLocaleLowerCase("pt-BR").includes(normalizedCompanySearch)
  const filteredPeople = people.filter((person) => {
    const searchableText = [
      person.first_name,
      person.last_name,
      person.phone1 ?? "",
      person.phone2 ?? "",
      person.company,
    ]
      .join(" ")
      .toLocaleLowerCase("pt-BR")

    return searchTerms.every((term) => searchableText.includes(term))
  })
  const pageCount = Math.ceil(filteredPeople.length / PEOPLE_PER_PAGE)
  const currentPage = Math.min(page, Math.max(pageCount, 1))
  const pagePeople = filteredPeople.slice(
    (currentPage - 1) * PEOPLE_PER_PAGE,
    currentPage * PEOPLE_PER_PAGE
  )
  const groups = new Map<string, Person[]>()
  for (const person of pagePeople) {
    const initial =
      person.first_name.charAt(0).toLocaleUpperCase("pt-BR") || "#"
    const group = groups.get(initial) ?? []
    group.push(person)
    groups.set(initial, group)
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-4 border-b px-6 py-5">
        <RouteHeading icon={ContactRoundIcon} title="Contatos" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-xl">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="people-directory-search"
              aria-label="Buscar pessoas"
              placeholder="Pesquisar por nome, telefone ou empresa"
              autoComplete="new-password"
              value={search}
              onValueChange={(value) => {
                setSearch(value)
                setPage(1)
              }}
              className="pl-9"
            />
          </div>
          <Button className="sm:ml-auto" onClick={openCreateForm}>
            <PlusIcon />
            Criar pessoa
          </Button>
        </div>
      </div>
      {mutationError && (
        <p role="alert" className="mx-6 mt-4 text-sm text-destructive">
          {mutationError}
        </p>
      )}
      {companyLoadError && (
        <p role="alert" className="mx-6 mt-4 text-sm text-destructive">
          Não foi possível carregar a lista de empresas: {companyLoadError}
        </p>
      )}
      {error ? (
        <p role="alert" className="p-6 text-sm text-destructive">
          {error}
        </p>
      ) : isLoading ? (
        <p className="p-6 text-sm text-muted-foreground">
          Carregando pessoas...
        </p>
      ) : people.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <UsersIcon className="size-10 text-muted-foreground" />
          <h2 className="font-medium">Sua lista de pessoas está vazia</h2>
          <p className="text-sm text-muted-foreground">
            Cadastre uma pessoa para compartilhar o contato com todos.
          </p>
          <Button onClick={openCreateForm}>
            <PlusIcon />
            Criar pessoa
          </Button>
        </div>
      ) : filteredPeople.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          Nenhuma pessoa encontrada.
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto px-6 pb-8">
          {filteredPeople.length > PEOPLE_PER_PAGE && (
            <nav
              aria-label="Paginação de contatos"
              className="flex flex-wrap items-center justify-between gap-3 border-b py-3"
            >
              <p className="text-sm text-muted-foreground" aria-live="polite">
                Mostrando {(currentPage - 1) * PEOPLE_PER_PAGE + 1}–
                {Math.min(currentPage * PEOPLE_PER_PAGE, filteredPeople.length)}{" "}
                de {filteredPeople.length} contatos
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeftIcon />
                  Anterior
                </Button>
                <span className="min-w-16 text-center text-sm text-muted-foreground">
                  {currentPage} / {pageCount}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage === pageCount}
                >
                  Próxima
                  <ChevronRightIcon />
                </Button>
              </div>
            </nav>
          )}
          <div className="hidden grid-cols-[minmax(14rem,1.3fr)_minmax(10rem,1fr)_minmax(11rem,1fr)_minmax(12rem,1.2fr)_5rem] gap-4 border-b py-3 text-xs font-medium text-muted-foreground md:grid">
            <span>Nome</span>
            <span>Empresa</span>
            <span>Telefone</span>
            <span>Cadastro e última atualização</span>
            <span className="sr-only">Ações</span>
          </div>
          {Array.from(groups, ([initial, group]) => (
            <section
              key={initial}
              aria-label={`Pessoas com inicial ${initial}`}
            >
              <h2 className="sticky top-0 z-10 border-b bg-background/95 py-3 text-sm font-semibold text-primary backdrop-blur">
                {initial}
              </h2>
              {group.map((person) => {
                const contactPhone = person.phone1 ?? person.phone2
                const company = findCompany(person.company, companies)

                function openWhatsApp() {
                  if (contactPhone) {
                    window.open(
                      getPhoneHref(contactPhone),
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                }

                return (
                  <article
                    key={person.id}
                    role={contactPhone ? "link" : undefined}
                    tabIndex={contactPhone ? 0 : undefined}
                    aria-label={
                      contactPhone
                        ? `Abrir conversa no WhatsApp com ${person.first_name} ${person.last_name}`
                        : undefined
                    }
                    onClick={(event) => {
                      if (
                        !contactPhone ||
                        (event.target instanceof Element &&
                          event.target.closest("a, button"))
                      ) {
                        return
                      }
                      openWhatsApp()
                    }}
                    onKeyDown={(event) => {
                      if (
                        !contactPhone ||
                        (event.target instanceof Element &&
                          event.target.closest("a, button"))
                      ) {
                        return
                      }
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        openWhatsApp()
                      }
                    }}
                    className={`grid gap-3 border-b py-4 md:grid-cols-[minmax(14rem,1.3fr)_minmax(10rem,1fr)_minmax(11rem,1fr)_minmax(12rem,1.2fr)_5rem] md:items-center md:gap-4 ${
                      contactPhone
                        ? "cursor-pointer hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {company ? (
                        <CompanyIcon
                          icon={company.icon}
                          color={company.color}
                          className="ml-4 size-10 rounded-full"
                        />
                      ) : (
                        <div className="ml-4 flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          {getInitials(person)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {person.first_name} {person.last_name}
                          <span
                            className={`ml-4 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              person.auth_user_id
                                ? "bg-primary/10 text-primary"
                                : "bg-green-600/10 text-green-700 dark:text-green-400"
                            }`}
                          >
                            {person.auth_user_id ? "Usuário" : "Pessoa"}
                          </span>
                        </p>
                        <p className="truncate text-xs text-muted-foreground md:hidden">
                          {person.company}
                        </p>
                      </div>
                    </div>
                    <p className="hidden truncate text-sm md:block">
                      {company ? (
                        <CompanyIcon
                          icon={company.icon}
                          color={company.color}
                          className="mr-2 inline-flex size-5 align-middle"
                        />
                      ) : (
                        <Building2Icon className="mr-2 inline size-4 text-muted-foreground" />
                      )}
                      {person.company}
                    </p>
                    <div className="flex flex-col gap-1 pl-[3.25rem] text-base md:pl-0">
                      {[person.phone1, person.phone2]
                        .filter((phone): phone is string => Boolean(phone))
                        .map((phone) => (
                          <a
                            key={phone}
                            href={getPhoneHref(phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Conversar no WhatsApp com ${person.first_name} ${person.last_name} pelo número ${formatPhone(phone)}`}
                            className="text-muted-foreground hover:text-foreground hover:underline"
                          >
                            {formatPhone(phone)}
                          </a>
                        ))}
                    </div>
                    <div className="pl-[3.25rem] text-xs text-muted-foreground md:pl-0">
                      <p>Cadastrado por: {person.created_by_name}</p>
                      <p>
                        Atualizado por: {person.updated_by_name} ·{" "}
                        {formatDate(person.updated_at)}
                      </p>
                    </div>
                    <div className="flex justify-end gap-1 pl-[3.25rem] md:pl-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Editar ${person.first_name} ${person.last_name}`}
                        onClick={() => openEditForm(person)}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Apagar ${person.first_name} ${person.last_name}`}
                        disabled={
                          deletingId === person.id ||
                          Boolean(person.auth_user_id)
                        }
                        title={
                          person.auth_user_id
                            ? "Não é possível apagar uma pessoa vinculada a uma conta"
                            : "Apagar pessoa"
                        }
                        onClick={() => void handleDelete(person)}
                      >
                        <Trash2Icon className="text-destructive" />
                      </Button>
                    </div>
                  </article>
                )
              })}
            </section>
          ))}
        </div>
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="gap-0 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingPerson ? "Editar pessoa" : "Criar pessoa"}
            </SheetTitle>
            <SheetDescription>
              As alterações ficam visíveis para todos os usuários.
            </SheetDescription>
          </SheetHeader>
          <form
            className="flex flex-col gap-5 px-6 pb-6"
            onSubmit={handleSubmit}
          >
            <Field>
              <FieldLabel htmlFor="person-first-name">Nome</FieldLabel>
              <Input
                id="person-first-name"
                name="first_name"
                autoComplete="given-name"
                value={form.first_name}
                onChange={(event) =>
                  setForm({ ...form, first_name: event.target.value })
                }
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="person-last-name">Sobrenome</FieldLabel>
              <Input
                id="person-last-name"
                name="last_name"
                autoComplete="family-name"
                value={form.last_name}
                onChange={(event) =>
                  setForm({ ...form, last_name: event.target.value })
                }
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="person-phone1">Telefone 1</FieldLabel>
              <Input
                id="person-phone1"
                name="phone1"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 99999-9999"
                value={form.phone1}
                onChange={(event) =>
                  setForm({ ...form, phone1: event.target.value })
                }
                required={!editingPerson?.auth_user_id}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="person-phone2">
                Telefone 2 (opcional)
              </FieldLabel>
              <Input
                id="person-phone2"
                name="phone2"
                type="tel"
                inputMode="tel"
                placeholder="(11) 3333-3333"
                value={form.phone2}
                onChange={(event) =>
                  setForm({ ...form, phone2: event.target.value })
                }
              />
            </Field>
            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm leading-none font-medium">
                Empresa
              </legend>
              <Input
                type="search"
                aria-label="Buscar empresa"
                placeholder="Buscar empresa"
                value={companySearch}
                onChange={(event) => {
                  setCompanySearch(event.target.value)
                  setCompanyCreateError("")
                }}
              />
              <div className="max-h-40 overflow-y-auto rounded-md border p-3">
                <div className="flex flex-col gap-3">
                  {showLegacyCompany && (
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="company-selection"
                        value={CURRENT_COMPANY}
                        checked
                        onChange={() => setCompanySelection(CURRENT_COMPANY)}
                        className="accent-primary"
                      />
                      {form.company} (empresa atual)
                    </label>
                  )}
                  {filteredCompanies.map((company) => (
                    <label
                      key={company.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        name="company-selection"
                        value={company.id}
                        checked={companySelection === company.id}
                        onChange={() => {
                          setCompanySelection(company.id)
                          setForm({ ...form, company: company.name })
                        }}
                        className="accent-primary"
                      />
                      <CompanyIcon
                        icon={company.icon}
                        color={company.color}
                        className="size-6"
                      />
                      {company.name}
                    </label>
                  ))}
                  {filteredCompanies.length === 0 && !showLegacyCompany && (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma empresa encontrada.
                    </p>
                  )}
                </div>
              </div>
              {normalizedCompanySearch &&
                filteredCompanies.length === 0 &&
                !showLegacyCompany && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleCreateCompany()}
                    disabled={isCreatingCompany}
                  >
                    <PlusIcon />
                    {isCreatingCompany
                      ? "Cadastrando empresa..."
                      : `Cadastrar empresa "${companySearch.trim()}"`}
                  </Button>
                )}
              {companyCreateError && (
                <p role="alert" className="text-sm text-destructive">
                  {companyCreateError}
                </p>
              )}
              <Link
                href="/empresas"
                className="w-fit text-sm text-primary underline-offset-4 hover:underline"
              >
                Gerenciar empresas cadastradas
              </Link>
            </fieldset>
            {mutationError && (
              <p role="alert" className="text-sm text-destructive">
                {mutationError}
              </p>
            )}
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? "Salvando..."
                : editingPerson
                  ? "Salvar alterações"
                  : "Cadastrar pessoa"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
