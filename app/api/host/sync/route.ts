import { timingSafeEqual } from "node:crypto"
import ExcelJS from "exceljs"
import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const MAX_FILE_SIZE = 4 * 1024 * 1024
const BUCKET_NAME = "operator-schedule"
const STORAGE_PATH = "Escala COD 2026.xlsx"
const REQUIRED_SHEETS = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
]

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } }
  )
}

function hasValidToken(request: Request, expectedToken: string) {
  const authorization = request.headers.get("authorization") ?? ""
  const prefix = "Bearer "
  if (
    authorization.slice(0, prefix.length).toLowerCase() !== prefix.toLowerCase()
  ) {
    return false
  }

  const provided = Buffer.from(authorization.slice(prefix.length), "utf8")
  const expected = Buffer.from(expectedToken, "utf8")
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  )
}

export async function POST(request: Request) {
  const uploadToken = process.env.HOST_UPLOAD_TOKEN
  if (!uploadToken || uploadToken.length < 32) {
    console.error("HOST_UPLOAD_TOKEN is missing or shorter than 32 characters.")
    return jsonError("O serviço de sincronização não está configurado.", 503)
  }
  if (!hasValidToken(request, uploadToken)) {
    return jsonError("Token de sincronização inválido.", 401)
  }

  const contentType = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase()
  if (contentType !== XLSX_CONTENT_TYPE) {
    return jsonError("Envie uma planilha XLSX válida.", 415)
  }

  const contentLength = Number(request.headers.get("content-length"))
  if (Number.isFinite(contentLength) && contentLength > MAX_FILE_SIZE) {
    return jsonError("A planilha excede o limite de 4 MB.", 413)
  }

  let content: Buffer
  try {
    content = Buffer.from(await request.arrayBuffer())
  } catch (error) {
    console.error("Failed to read schedule upload:", error)
    return jsonError("Não foi possível ler a planilha enviada.", 400)
  }
  if (!content.length) {
    return jsonError("O arquivo está vazio.", 400)
  }
  if (content.length > MAX_FILE_SIZE) {
    return jsonError("A planilha excede o limite de 4 MB.", 413)
  }
  if (content[0] !== 0x50 || content[1] !== 0x4b) {
    return jsonError("O arquivo enviado não é uma planilha XLSX válida.", 400)
  }

  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.load(Uint8Array.from(content).buffer)
  } catch {
    return jsonError("O arquivo enviado não é uma planilha XLSX válida.", 400)
  }
  const sheetNames = new Set(workbook.worksheets.map((sheet) => sheet.name))
  const missingSheets = REQUIRED_SHEETS.filter((name) => !sheetNames.has(name))
  if (missingSheets.length) {
    return jsonError(
      `A planilha não contém as abas obrigatórias: ${missingSheets.join(", ")}.`,
      400
    )
  }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (error) {
    console.error("Schedule synchronization is not configured:", error)
    return jsonError("O serviço de sincronização não está configurado.", 503)
  }

  const { error } = await admin.storage
    .from(BUCKET_NAME)
    .upload(STORAGE_PATH, content, {
      contentType: XLSX_CONTENT_TYPE,
      upsert: true,
    })
  if (error) {
    console.error("Failed to upload schedule to Supabase Storage:", error)
    return jsonError("Não foi possível atualizar a planilha no servidor.", 500)
  }

  return NextResponse.json(
    { message: "Planilha sincronizada." },
    { headers: { "Cache-Control": "no-store" } }
  )
}
