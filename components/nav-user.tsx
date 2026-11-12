"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { createClient } from "@/lib/supabase/client"
import { ChevronsUpDownIcon, LogOutIcon, PencilIcon } from "lucide-react"
import { CompanyIcon } from "@/components/company-icon"
import { GameIconPicker } from "@/components/game-icon-picker"
import { createProfileAvatar, parseProfileAvatar } from "@/lib/profile-avatar"
import type { CompanyIconName } from "@/lib/company-icons"

function UserAvatar({ avatar, name }: { avatar: string; name: string }) {
  const profileAvatar = parseProfileAvatar(avatar)

  return (
    <Avatar>
      {profileAvatar ? (
        <CompanyIcon
          icon={profileAvatar.icon}
          color={profileAvatar.color}
          className="size-full rounded-full"
          loading="eager"
        />
      ) : (
        <AvatarImage src={avatar} alt={name} />
      )}
      {!profileAvatar && (
        <AvatarFallback>
          {name.slice(0, 2).toLocaleUpperCase("pt-BR")}
        </AvatarFallback>
      )}
    </Avatar>
  )
}

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
    firstName?: string
    lastName?: string
    ddd?: string
    telefone?: string
    ddd2?: string
    telefone2?: string
  }
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileFirstName, setProfileFirstName] = useState(
    user.firstName ?? user.name.split(/\s+/)[0] ?? ""
  )
  const [profileLastName, setProfileLastName] = useState(
    user.lastName ?? user.name.split(/\s+/).slice(1).join(" ")
  )
  const [profileAvatarIcon, setProfileAvatarIcon] =
    useState<CompanyIconName>("delapouite/factory")
  const [profileAvatarColor, setProfileAvatarColor] = useState("#000000")
  const [profileEmail, setProfileEmail] = useState(user.email)
  const [profilePassword, setProfilePassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [profileDdd, setProfileDdd] = useState(user.ddd ?? "")
  const [profileTelefone, setProfileTelefone] = useState(user.telefone ?? "")
  const [profileDdd2, setProfileDdd2] = useState(user.ddd2 ?? "")
  const [profileTelefone2, setProfileTelefone2] = useState(user.telefone2 ?? "")
  const [profileError, setProfileError] = useState("")
  const [profileMessage, setProfileMessage] = useState("")
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [logoutError, setLogoutError] = useState("")
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const firstName = profileFirstName.trim()
    const lastName = profileLastName.trim()
    const email = profileEmail.trim()
    const password = profilePassword
    const normalizedDdd = profileDdd.replace(/\D/g, "")
    const normalizedTelefone = profileTelefone.replace(/\D/g, "")
    const normalizedDdd2 = profileDdd2.replace(/\D/g, "")
    const normalizedTelefone2 = profileTelefone2.replace(/\D/g, "")
    const avatar = createProfileAvatar(profileAvatarIcon, profileAvatarColor)

    setProfileError("")
    setProfileMessage("")

    if (password !== confirmPassword) {
      setProfileError("A nova senha e a confirmação não são iguais.")
      return
    }

    if (Boolean(normalizedDdd2) !== Boolean(normalizedTelefone2)) {
      setProfileError("Informe o DDD e o telefone do segundo número.")
      return
    }

    setIsSavingProfile(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        ...(email !== user.email ? { email } : {}),
        ...(password ? { password } : {}),
        data: {
          first_name: firstName,
          last_name: lastName,
          name: `${firstName} ${lastName}`,
          ddd: normalizedDdd,
          telefone: normalizedTelefone,
          ddd2: normalizedDdd2,
          telefone2: normalizedTelefone2,
          avatar,
        },
      })

      if (error) {
        setProfileError(`Não foi possível atualizar o perfil: ${error.message}`)
        return
      }

      setProfileMessage(
        email !== user.email
          ? "Perfil atualizado. Confirme o novo e-mail pelo link enviado para concluir a alteração."
          : "Perfil atualizado com sucesso."
      )
      setProfileEmail(email)
      setProfileFirstName(firstName)
      setProfileLastName(lastName)
      setProfileDdd(normalizedDdd)
      setProfileTelefone(normalizedTelefone)
      setProfileDdd2(normalizedDdd2)
      setProfileTelefone2(normalizedTelefone2)
      setProfilePassword("")
      setConfirmPassword("")
      router.refresh()
    } catch (error) {
      setProfileError(
        `Não foi possível atualizar o perfil: ${
          error instanceof Error ? error.message : "erro inesperado"
        }`
      )
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true)
    setLogoutError("")

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        setLogoutError(`Não foi possível sair: ${error.message}`)
        setIsSigningOut(false)
        return
      }

      router.replace("/login")
      router.refresh()
    } catch (error) {
      setLogoutError(
        `Não foi possível sair: ${
          error instanceof Error ? error.message : "erro inesperado"
        }`
      )
      setIsSigningOut(false)
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <UserAvatar avatar={user.avatar} name={user.name} />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-fit"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <UserAvatar avatar={user.avatar} name={user.name} />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                setProfileError("")
                setProfileMessage("")
                setProfileEmail(user.email)
                setProfileFirstName(
                  user.firstName ?? user.name.split(/\s+/)[0] ?? ""
                )
                setProfileLastName(
                  user.lastName ?? user.name.split(/\s+/).slice(1).join(" ")
                )
                const profileAvatar = parseProfileAvatar(user.avatar)
                setProfileAvatarIcon(
                  profileAvatar?.icon ?? "delapouite/factory"
                )
                setProfileAvatarColor(profileAvatar?.color ?? "#000000")
                setProfileDdd(user.ddd ?? "")
                setProfileTelefone(user.telefone ?? "")
                setProfileDdd2(user.ddd2 ?? "")
                setProfileTelefone2(user.telefone2 ?? "")
                setProfilePassword("")
                setConfirmPassword("")
                setProfileOpen(true)
              }}
            >
              <PencilIcon />
              Editar perfil
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isSigningOut} onClick={handleSignOut}>
              <LogOutIcon />
              {isSigningOut ? "Saindo..." : "Sair"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
          <SheetContent
            side={isMobile ? "bottom" : "right"}
            className="gap-0 overflow-y-auto"
          >
            <SheetHeader>
              <SheetTitle>Editar perfil</SheetTitle>
              <SheetDescription>
                Atualize seu e-mail, senha e telefone.
              </SheetDescription>
            </SheetHeader>
            <form
              className="flex flex-col gap-4 px-6 pb-6"
              onSubmit={handleProfileSubmit}
            >
              <Field>
                <FieldLabel htmlFor="profile-first-name">Nome</FieldLabel>
                <Input
                  id="profile-first-name"
                  name="firstName"
                  type="text"
                  value={profileFirstName}
                  onChange={(event) => setProfileFirstName(event.target.value)}
                  autoComplete="given-name"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-last-name">Sobrenome</FieldLabel>
                <Input
                  id="profile-last-name"
                  name="lastName"
                  type="text"
                  value={profileLastName}
                  onChange={(event) => setProfileLastName(event.target.value)}
                  autoComplete="family-name"
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Foto de perfil</FieldLabel>
                <GameIconPicker
                  icon={profileAvatarIcon}
                  color={profileAvatarColor}
                  onIconChange={setProfileAvatarIcon}
                  onColorChange={setProfileAvatarColor}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-email">E-mail</FieldLabel>
                <Input
                  id="profile-email"
                  name="email"
                  type="email"
                  value={profileEmail}
                  onChange={(event) => setProfileEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-password">Nova senha</FieldLabel>
                <Input
                  id="profile-password"
                  name="password"
                  type="password"
                  value={profilePassword}
                  onChange={(event) => setProfilePassword(event.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Deixe vazio para manter a senha atual"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-confirm-password">
                  Confirmar nova senha
                </FieldLabel>
                <Input
                  id="profile-confirm-password"
                  name="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Repita a nova senha"
                />
              </Field>
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-end gap-3">
                <Field>
                  <FieldLabel htmlFor="profile-ddd">DDD</FieldLabel>
                  <Input
                    id="profile-ddd"
                    name="ddd"
                    type="tel"
                    value={profileDdd}
                    onChange={(event) => setProfileDdd(event.target.value)}
                    inputMode="numeric"
                    autoComplete="tel-area-code"
                    pattern="[0-9]{2}"
                    maxLength={2}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="profile-telefone">Telefone</FieldLabel>
                  <Input
                    id="profile-telefone"
                    name="telefone"
                    type="tel"
                    value={profileTelefone}
                    onChange={(event) => setProfileTelefone(event.target.value)}
                    inputMode="numeric"
                    autoComplete="tel-national"
                    pattern="[0-9]{8,9}"
                    maxLength={9}
                    required
                  />
                </Field>
              </div>
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-end gap-3">
                <Field>
                  <FieldLabel htmlFor="profile-ddd2">DDD 2</FieldLabel>
                  <Input
                    id="profile-ddd2"
                    name="ddd2"
                    type="tel"
                    value={profileDdd2}
                    onChange={(event) => setProfileDdd2(event.target.value)}
                    inputMode="numeric"
                    autoComplete="tel-area-code"
                    pattern="[0-9]{2}"
                    maxLength={2}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="profile-telefone2">
                    Telefone 2 (opcional)
                  </FieldLabel>
                  <Input
                    id="profile-telefone2"
                    name="telefone2"
                    type="tel"
                    value={profileTelefone2}
                    onChange={(event) =>
                      setProfileTelefone2(event.target.value)
                    }
                    inputMode="numeric"
                    autoComplete="tel-national"
                    pattern="[0-9]{8,9}"
                    maxLength={9}
                  />
                </Field>
              </div>
              {profileError && (
                <p role="alert" className="text-sm text-destructive">
                  {profileError}
                </p>
              )}
              {profileMessage && (
                <p role="status" className="text-sm text-muted-foreground">
                  {profileMessage}
                </p>
              )}
              <Button type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? "Salvando..." : "Salvar alterações"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
        {logoutError && (
          <p role="alert" className="px-2 pt-1 text-xs text-destructive">
            {logoutError}
          </p>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
