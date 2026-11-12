"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CompanyIcon } from "@/components/company-icon"
import { GameIconPicker } from "@/components/game-icon-picker"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { isCompanyIconName, type CompanyIconName } from "@/lib/company-icons"
import { createProfileAvatar } from "@/lib/profile-avatar"
import { createClient } from "@/lib/supabase/client"

type Company = {
  id: string
  name: string
  icon: CompanyIconName
  color: string
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

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const router = useRouter()
  const supabase = createClient()
  const [avatarIcon, setAvatarIcon] =
    useState<CompanyIconName>("delapouite/factory")
  const [avatarColor, setAvatarColor] = useState("#000000")
  const [mensagem, setMensagem] = useState("")
  const [erro, setErro] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [empresas, setEmpresas] = useState<Company[]>([])
  const [empresaSelecionada, setEmpresaSelecionada] = useState("")
  const [buscaEmpresa, setBuscaEmpresa] = useState("")
  const [carregandoEmpresas, setCarregandoEmpresas] = useState(true)
  const [erroEmpresas, setErroEmpresas] = useState("")
  const empresasFiltradas = empresas.filter((empresa) =>
    empresa.name
      .toLocaleLowerCase("pt-BR")
      .includes(buscaEmpresa.trim().toLocaleLowerCase("pt-BR"))
  )
  const empresaSelecionadaData = empresas.find(
    (empresa) => empresa.name === empresaSelecionada
  )

  useEffect(() => {
    let active = true

    async function carregarEmpresas() {
      try {
        const response = await fetch("/api/signup/companies", {
          cache: "no-store",
        })
        const payload: unknown = await response.json()
        if (!response.ok) {
          throw new Error(
            payload !== null &&
              typeof payload === "object" &&
              "error" in payload &&
              typeof payload.error === "string"
              ? payload.error
              : "Não foi possível carregar as empresas."
          )
        }
        if (
          payload === null ||
          typeof payload !== "object" ||
          !("companies" in payload) ||
          !Array.isArray(payload.companies) ||
          !payload.companies.every(isCompany)
        ) {
          throw new Error("A resposta de empresas tem um formato inválido.")
        }
        if (active) {
          setEmpresas(payload.companies)
          setErroEmpresas("")
        }
      } catch (error) {
        if (active) {
          setErroEmpresas(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar as empresas."
          )
        }
      } finally {
        if (active) {
          setCarregandoEmpresas(false)
        }
      }
    }

    void carregarEmpresas()
    return () => {
      active = false
    }
  }, [])

  async function handleSignupSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)

    setMensagem("")
    setSalvando(true)

    try {
      const firstName = String(formData.get("firstName") ?? "").trim()
      const lastName = String(formData.get("lastName") ?? "").trim()
      const ddd = String(formData.get("ddd") ?? "").replace(/\D/g, "")
      const telefone = String(formData.get("telefone") ?? "").replace(/\D/g, "")
      const ddd2 = String(formData.get("ddd2") ?? "").replace(/\D/g, "")
      const telefone2 = String(formData.get("telefone2") ?? "").replace(
        /\D/g,
        ""
      )
      const email = String(formData.get("email") ?? "").trim()
      const password = String(formData.get("password") ?? "")
      const company = String(formData.get("company") ?? "").trim()
      if (Boolean(ddd2) !== Boolean(telefone2)) {
        setErro(true)
        setMensagem("Informe o DDD e o telefone do segundo número.")
        return
      }

      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            name: `${firstName} ${lastName}`,
            ddd,
            telefone,
            ddd2,
            telefone2,
            company: company || "Não informada",
            avatar: createProfileAvatar(avatarIcon, avatarColor),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signupError) {
        throw signupError
      }

      if (data.session) {
        router.replace("/inicio")
        return
      }

      setErro(false)
      setMensagem("Cadastro criado. Confira seu e-mail para confirmar a conta.")
    } catch {
      setErro(true)
      setMensagem("Não foi possível conectar ao servidor.")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Criando uma conta</CardTitle>
        <CardDescription>
          Informe seus dados abaixo para criar sua conta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignupSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="firstName">Nome</FieldLabel>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                placeholder="Maria"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="lastName">Sobrenome</FieldLabel>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                placeholder="Silva"
                required
              />
            </Field>
            <Field>
              <FieldLabel>Foto de perfil</FieldLabel>
              <GameIconPicker
                icon={avatarIcon}
                color={avatarColor}
                onIconChange={setAvatarIcon}
                onColorChange={setAvatarColor}
              />
            </Field>
            <Field>
              <FieldLabel>Empresa</FieldLabel>
              <input name="company" type="hidden" value={empresaSelecionada} />
              <Input
                type="search"
                aria-label="Buscar empresa"
                placeholder="Buscar empresa"
                value={buscaEmpresa}
                onChange={(event) => setBuscaEmpresa(event.target.value)}
              />
              <div
                id="company"
                role="radiogroup"
                aria-label="Empresa"
                className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-md border p-2"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={!empresaSelecionada}
                  disabled={carregandoEmpresas}
                  onClick={() => setEmpresaSelecionada("")}
                  className={`flex items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent disabled:opacity-50 ${
                    !empresaSelecionada ? "bg-accent" : ""
                  }`}
                >
                  <CompanyIcon
                    icon="delapouite/factory"
                    color="#6b7280"
                    className="size-7"
                  />
                  Não informada
                </button>
                {empresasFiltradas.map((empresa) => (
                  <button
                    key={empresa.id}
                    type="button"
                    role="radio"
                    aria-checked={empresaSelecionada === empresa.name}
                    onClick={() => setEmpresaSelecionada(empresa.name)}
                    className={`flex items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent ${
                      empresaSelecionada === empresa.name ? "bg-accent" : ""
                    }`}
                  >
                    <CompanyIcon
                      icon={empresa.icon}
                      color={empresa.color}
                      className="size-7"
                    />
                    {empresa.name}
                  </button>
                ))}
                {!carregandoEmpresas && !erroEmpresas && (
                  empresas.length === 0 ? (
                    <FieldDescription>
                      Nenhuma empresa cadastrada.
                    </FieldDescription>
                  ) : (
                    empresasFiltradas.length === 0 && (
                      <FieldDescription>
                        Nenhuma empresa encontrada.
                      </FieldDescription>
                    )
                  )
                )}
              </div>
              {erroEmpresas ? (
                <FieldDescription role="alert" className="text-destructive">
                  {erroEmpresas}
                </FieldDescription>
              ) : carregandoEmpresas ? (
                <FieldDescription>Carregando empresas...</FieldDescription>
              ) : empresaSelecionadaData ? (
                <FieldDescription>
                  Empresa selecionada: {empresaSelecionadaData.name}
                </FieldDescription>
              ) : null}
            </Field>
            <div className="grid grid-cols-[5rem_1fr] gap-3">
              <Field>
                <FieldLabel htmlFor="ddd">DDD</FieldLabel>
                <Input
                  id="ddd"
                  name="ddd"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-area-code"
                  placeholder="11"
                  pattern="[0-9]{2}"
                  maxLength={2}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="telefone">Telefone</FieldLabel>
                <Input
                  id="telefone"
                  name="telefone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="912345678"
                  pattern="[0-9]{8,9}"
                  maxLength={9}
                  required
                />
              </Field>
            </div>
            <div className="grid grid-cols-[5rem_1fr] gap-3">
              <Field>
                <FieldLabel htmlFor="ddd2">DDD (2º telefone)</FieldLabel>
                <Input
                  id="ddd2"
                  name="ddd2"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-area-code"
                  placeholder="11"
                  pattern="[0-9]{2}"
                  maxLength={2}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="telefone2">
                  2º telefone (opcional)
                </FieldLabel>
                <Input
                  id="telefone2"
                  name="telefone2"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="912345678"
                  pattern="[0-9]{8,9}"
                  maxLength={9}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="email">E-mail</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="maria@exemplo.com"
                required
              />
              <FieldDescription>
                Não compartilharemos seu e-mail com ninguém.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Senha</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required
              />
              <FieldDescription>
                A senha deve ter pelo menos 8 caracteres.
              </FieldDescription>
            </Field>
            <FieldGroup>
              <Field>
                <Button type="submit" disabled={salvando}>
                  {salvando ? "Salvando..." : "Criar conta"}
                </Button>
                {mensagem && (
                  <p
                    className={`text-sm ${erro ? "text-destructive" : "text-muted-foreground"}`}
                    role={erro ? "alert" : "status"}
                  >
                    {mensagem}
                  </p>
                )}
                <FieldDescription className="px-6 text-center">
                  Já tem uma conta? <Link href="/login">Entrar</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
