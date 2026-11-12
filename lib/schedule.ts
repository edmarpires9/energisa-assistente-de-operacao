import "server-only"

import ExcelJS from "exceljs"
import { join } from "node:path"

export type ScheduleEntry = {
  time: string
  regional?: string
}

export type OperatorSchedule = Record<string, Record<string, ScheduleEntry[]>>

export type ScheduleData = {
  operators: string[]
  schedule: OperatorSchedule
}

const SCHEDULE_YEAR = 2026
const MONTHS = [
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
const WORKBOOK_PATH = join(
  process.cwd(),
  "app",
  "database",
  "Escala COD 2026.xlsx"
)

let schedulePromise: Promise<ScheduleData> | undefined

export function getScheduleData() {
  schedulePromise ??= loadScheduleData()
  return schedulePromise
}

async function loadScheduleData(): Promise<ScheduleData> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(WORKBOOK_PATH)
  const schedule: OperatorSchedule = {}
  const operators = new Set<string>()

  for (const [monthIndex, monthName] of MONTHS.entries()) {
    const worksheet = workbook.getWorksheet(monthName)
    if (!worksheet) {
      throw new Error(`A aba "${monthName}" não foi encontrada na escala.`)
    }

    const daysInMonth = new Date(
      Date.UTC(SCHEDULE_YEAR, monthIndex + 1, 0)
    ).getUTCDate()
    const dateColumns = getDateColumns(worksheet, daysInMonth)

    worksheet.eachRow((row, rowNumber) => {
      const shiftText = worksheet
        .getCell(rowNumber, 1)
        .text.split("\n")[0]
        .trim()
      if (!shiftText) {
        return
      }

      const time = formatShift(shiftText)
      if (!time) {
        return
      }

      const regionalText = worksheet
        .getCell(rowNumber, 2)
        .text.split("\n")[0]
        .trim()
      const isDayOff = /^folga\b/i.test(shiftText)
      const regional = isDayOff
        ? "FOLGA"
        : regionalText && regionalText !== shiftText
          ? regionalText
          : undefined
      const entry: ScheduleEntry = { time, regional }

      for (const [day, column] of dateColumns) {
        const operator = row.getCell(column).text.trim()
        if (!operator || /^\d+$/.test(operator)) {
          continue
        }

        operators.add(operator)
        const dateKey = new Date(Date.UTC(SCHEDULE_YEAR, monthIndex, day))
          .toISOString()
          .slice(0, 10)
        schedule[operator] ??= {}
        schedule[operator][dateKey] ??= []
        schedule[operator][dateKey].push(entry)
      }
    })
  }

  return {
    operators: [...operators].sort((left, right) =>
      left.localeCompare(right, "pt-BR")
    ),
    schedule,
  }
}

function getDateColumns(worksheet: ExcelJS.Worksheet, daysInMonth: number) {
  const firstColumn = 3
  const columns = new Map<number, number>()

  for (let day = 1; day <= daysInMonth; day++) {
    const column = firstColumn + day - 1
    const headerDay = Number(worksheet.getCell(4, column).text)
    if (headerDay !== day) {
      throw new Error(
        `O cabeçalho do dia ${day} na aba "${worksheet.name}" é inválido.`
      )
    }
    columns.set(day, column)
  }

  return columns
}

function formatShift(shiftText: string) {
  const match = shiftText.match(/(\d{1,2})h\s*às\s*(\d{1,2})h?/i)
  if (match) {
    return `${match[1].padStart(2, "0")}:00 às ${match[2].padStart(2, "0")}:00`
  }

  if (/^folga\b/i.test(shiftText)) {
    return "FOLGA"
  }

  if (
    /^(treinamento|dia compensado|atestado afastamento|férias|sobreaviso)/i.test(
      shiftText
    )
  ) {
    return shiftText
  }

  return undefined
}
