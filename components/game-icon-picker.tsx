"use client"

import { useEffect, useState } from "react"

import { CompanyIcon } from "@/components/company-icon"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { CompanyIconName, GameIconOption } from "@/lib/company-icons"

const PAGE_SIZE = 48

function isGameIconOption(value: unknown): value is GameIconOption {
  return (
    value !== null &&
    typeof value === "object" &&
    "id" in value &&
    typeof value.id === "string" &&
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

function getErrorMessage(value: unknown) {
  return value !== null &&
    typeof value === "object" &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : "Não foi possível carregar os ícones."
}

export function GameIconPicker({
  icon,
  color,
  onIconChange,
  onColorChange,
}: {
  icon: CompanyIconName
  color: string
  onIconChange: (icon: CompanyIconName) => void
  onColorChange: (color: string) => void
}) {
  const [search, setSearch] = useState("")
  const [options, setOptions] = useState<GameIconOption[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    const timeout = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: search,
          limit: String(PAGE_SIZE),
        })
        const response = await fetch(`/api/signup/icons?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        const payload: unknown = await response.json()
        if (!response.ok) {
          throw new Error(getErrorMessage(payload))
        }
        if (!isGameIconResponse(payload)) {
          throw new Error("A resposta do catálogo de ícones é inválida.")
        }
        if (active) {
          setOptions(payload.icons)
          setTotal(payload.total)
        }
      } catch (loadError) {
        if (active && !controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Não foi possível carregar os ícones."
          )
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }, 180)

    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [search])

  async function loadMore() {
    setIsLoadingMore(true)
    setError("")
    try {
      const params = new URLSearchParams({
        q: search,
        offset: String(options.length),
        limit: String(PAGE_SIZE),
      })
      const response = await fetch(`/api/signup/icons?${params}`, {
        cache: "no-store",
      })
      const payload: unknown = await response.json()
      if (!response.ok) {
        throw new Error(getErrorMessage(payload))
      }
      if (!isGameIconResponse(payload)) {
        throw new Error("A resposta do catálogo de ícones é inválida.")
      }
      setOptions((current) => [...current, ...payload.icons])
      setTotal(payload.total)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar mais ícones."
      )
    } finally {
      setIsLoadingMore(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel>Ícone</FieldLabel>
        <Input
          type="search"
          aria-label="Buscar ícone por nome ou autor"
          placeholder="Buscar entre 4.180 ícones..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setOptions([])
            setTotal(0)
            setIsLoading(true)
            setError("")
          }}
        />
        <FieldDescription aria-live="polite">
          {isLoading
            ? "Buscando ícones..."
            : `${total.toLocaleString("pt-BR")} ícones encontrados`}
        </FieldDescription>
        <div
          role="radiogroup"
          aria-label="Ícones Game-icons.net"
          className="grid max-h-52 grid-cols-4 gap-2 overflow-y-auto rounded-md border p-2 sm:grid-cols-5"
        >
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={icon === option.id}
              aria-label={`${option.name}, por ${option.author}`}
              title={`${option.name} — ${option.author}`}
              onClick={() => onIconChange(option.id)}
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
                loading={option.id === icon ? "eager" : "lazy"}
              />
              <span className="w-full truncate">{option.name}</span>
            </button>
          ))}
          {!isLoading && options.length === 0 && (
            <p className="col-span-full p-3 text-center text-sm text-muted-foreground">
              Nenhum ícone encontrado.
            </p>
          )}
        </div>
        {options.length < total && (
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadMore()}
            disabled={isLoading || isLoadingMore}
          >
            {isLoadingMore ? "Carregando..." : "Carregar mais ícones"}
          </Button>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <FieldDescription>
          Ícone selecionado por{" "}
          {options.find((option) => option.id === icon)?.author ??
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
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="profile-color">Cor do perfil</FieldLabel>
        <div className="flex items-center gap-3">
          <Input
            id="profile-color"
            type="color"
            value={color}
            onChange={(event) => onColorChange(event.target.value)}
            className="h-10 w-14 cursor-pointer p-1"
          />
          <span className="text-sm text-muted-foreground">{color}</span>
          <CompanyIcon
            icon={icon}
            color={color}
            className="ml-auto size-10 rounded-full"
            loading="eager"
          />
        </div>
      </Field>
    </div>
  )
}
