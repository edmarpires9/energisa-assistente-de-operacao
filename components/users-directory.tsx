"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { MessageCircleIcon, PhoneIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import { CompanyIcon } from "@/components/company-icon"
import { Input } from "@/components/ui/input"
import { parseProfileAvatar } from "@/lib/profile-avatar"

type DirectoryUser = {
  name: string
  surname: string
  avatar: string
  phone: string
  phone2: string
}

function isDirectoryResponse(value: unknown): value is {
  users: DirectoryUser[]
} {
  if (!value || typeof value !== "object" || !("users" in value)) {
    return false
  }

  const users = value.users
  return (
    Array.isArray(users) &&
    users.every(
      (user) =>
        user &&
        typeof user === "object" &&
        "name" in user &&
        typeof user.name === "string" &&
        "surname" in user &&
        typeof user.surname === "string" &&
        "avatar" in user &&
        typeof user.avatar === "string" &&
        "phone" in user &&
        typeof user.phone === "string" &&
        "phone2" in user &&
        typeof user.phone2 === "string"
    )
  )
}

function getInternationalPhone(phone: string) {
  const digits = phone.replace(/\D/g, "")

  if (/^\d{10,11}$/.test(digits)) {
    return `55${digits}`
  }

  return /^55\d{10,11}$/.test(digits) ? digits : null
}

export function UsersDirectory() {
  const [users, setUsers] = useState<DirectoryUser[]>([])
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadUsers() {
      try {
        const response = await fetch("/api/users", { cache: "no-store" })
        const payload: unknown = await response.json()

        if (!response.ok) {
          const message =
            payload &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof payload.error === "string"
              ? payload.error
              : "Não foi possível carregar os usuários."
          throw new Error(message)
        }

        if (!isDirectoryResponse(payload)) {
          throw new Error("A resposta de usuários tem um formato inválido.")
        }

        if (active) {
          setUsers(payload.users)
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Não foi possível carregar os usuários."
          )
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadUsers()
    return () => {
      active = false
    }
  }, [])

  if (isLoading) {
    return <p className="p-4 text-muted-foreground">Carregando usuários...</p>
  }

  if (error) {
    return (
      <p role="alert" className="p-4 text-sm text-destructive">
        {error}
      </p>
    )
  }

  if (users.length === 0) {
    return (
      <p className="p-4 text-muted-foreground">Nenhum usuário cadastrado.</p>
    )
  }

  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR")
  const filteredUsers = users.filter((user) =>
    [user.name, user.surname, user.phone, user.phone2]
      .join(" ")
      .toLocaleLowerCase("pt-BR")
      .includes(normalizedSearch)
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      <Input
        type="search"
        aria-label="Buscar usuários"
        placeholder="Buscar por nome ou telefone..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="max-w-md"
      />
      {filteredUsers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum usuário encontrado.
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),20rem))] justify-start gap-6">
          {filteredUsers.map((user, index) => (
            <Card
              key={`${user.name}-${user.surname}-${index}`}
              className="gap-0 rounded-2xl p-0"
            >
              <div className="relative aspect-[4/5] w-full bg-muted">
                {(() => {
                  const profileAvatar = parseProfileAvatar(user.avatar)
                  return profileAvatar ? (
                    <CompanyIcon
                      icon={profileAvatar.icon}
                      color={profileAvatar.color}
                      className="absolute inset-0 size-full rounded-none"
                      iconClassName="size-28"
                    />
                  ) : (
                    <Image
                      src={user.avatar || "/user.png"}
                      alt={`${user.name} ${user.surname}`}
                      fill
                      sizes="(max-width: 352px) calc(100vw - 32px), 320px"
                      className="object-cover"
                    />
                  )
                })()}
              </div>
              <div className="flex min-h-52 flex-col p-5">
                <h2 className="text-lg font-medium">
                  {user.name} {user.surname}
                </h2>
                <div className="mt-2 flex flex-col gap-2">
                  {[user.phone, user.phone2]
                    .filter(Boolean)
                    .map((phone, phoneIndex) => (
                      <div
                        key={`${phone}-${phoneIndex}`}
                        className="flex flex-col items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="flex items-center gap-2">
                          <PhoneIcon className="size-4 shrink-0" />
                          <span>{phone}</span>
                        </span>
                        <div className="flex items-center justify-start gap-2">
                          {getInternationalPhone(phone) && (
                            <a
                              href={`https://web.whatsapp.com/send?phone=${getInternationalPhone(phone)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Iniciar conversa no WhatsApp com ${user.name} ${user.surname}, telefone ${phoneIndex + 1}`}
                              title="WhatsApp"
                              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-4xl bg-green-700 px-3 text-xs font-medium text-white transition-colors hover:bg-green-800 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
                            >
                              <span>WhatsApp</span>
                              <MessageCircleIcon
                                aria-hidden="true"
                                className="size-4"
                              />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  {!user.phone && !user.phone2 && (
                    <p className="text-sm text-muted-foreground">
                      Telefone não informado
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
