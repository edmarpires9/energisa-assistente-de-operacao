"use client"

import * as React from "react"
import { ptBR } from "date-fns/locale"

import type { OperatorSchedule, ScheduleEntry } from "@/lib/schedule"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

const CALENDAR_TIME_ZONE = "America/Sao_Paulo"

function isVacation(entry: ScheduleEntry) {
  return /^férias\b/i.test(entry.time)
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function getScheduleLabel(entry: ScheduleEntry) {
  if (isVacation(entry)) {
    return "FÉRIAS"
  }

  return entry.regional && entry.regional !== "FOLGA"
    ? `${entry.time} · ${entry.regional}`
    : entry.time
}

function getScheduleTimeLabel(entry: ScheduleEntry) {
  if (isVacation(entry)) {
    return "FÉRIAS"
  }

  return entry.time === "FOLGA"
    ? "FOLGA"
    : entry.time.replace(/:00/g, "").replace(" às ", "-")
}

function getScheduleSecondaryLabel(entry: ScheduleEntry) {
  if (entry.regional && entry.regional !== "FOLGA") {
    return entry.regional
  }

  return entry.time === "22:00 às 06:00" ? "NOITE" : undefined
}

type CalendarDayPresentation = {
  schedule: OperatorSchedule
  selectedOperator: string
  currentDate: Date
  pastDaysBlurEnabled: boolean
}

const CalendarDayPresentationContext =
  React.createContext<CalendarDayPresentation | null>(null)

function ScheduleCalendarDayButton({
  children,
  modifiers,
  day,
  ...props
}: React.ComponentProps<typeof CalendarDayButton>) {
  const presentation = React.useContext(CalendarDayPresentationContext)

  if (!presentation) {
    throw new Error(
      "O contexto visual dos dias do calendário não foi definido."
    )
  }

  const daySchedule =
    presentation.schedule[presentation.selectedOperator]?.[
      getDateKey(day.date)
    ] ?? []
  const visibleSchedule = daySchedule.slice(0, 2)
  const isDayOff = daySchedule.some((entry) => entry.time === "FOLGA")
  const isVacationDay = daySchedule.some(isVacation)
  const isPastDay = getDateKey(day.date) < getDateKey(presentation.currentDate)
  const backgroundColor = modifiers.selected
    ? "#D8D8D8"
    : modifiers.today
      ? "#A1D99B"
      : isVacationDay
        ? "#4d84c7"
        : isDayOff
          ? "#b3c4d8"
          : undefined
  const title = daySchedule.length
    ? daySchedule.map(getScheduleLabel).join("; ")
    : "Não cadastrado"

  return (
    <CalendarDayButton
      day={day}
      modifiers={modifiers}
      title={title}
      {...props}
      className={`rounded-none data-[selected-single=true]:rounded-none ${
        modifiers.today
          ? "calendar-today-pulse border border-black dark:border-white"
          : ""
      }`}
      style={{
        backgroundColor,
        color: backgroundColor ? "#0f172a" : undefined,
        borderRadius: 0,
        filter: `blur(${presentation.pastDaysBlurEnabled && isPastDay ? "1000px" : "0px"})`,
        opacity: presentation.pastDaysBlurEnabled && isPastDay ? 0.4 : 1,
        transform: `scale(${presentation.pastDaysBlurEnabled && isPastDay ? 0.9 : 1})`,
        transition:
          "filter 1600ms ease-in-out, opacity 1600ms ease-in-out, transform 1600ms ease-in-out",
        minHeight: `calc(var(--cell-size) * ${Math.max(
          1.5,
          1.5 + (visibleSchedule.length - 1) * 0.75
        )})`,
      }}
    >
      {children}
      {!modifiers.outside && (
        <span className="block w-full min-w-0 text-[7px] leading-[10px]">
          {daySchedule.length ? (
            <>
              {visibleSchedule.map((entry, index) => {
                const secondaryLabel = getScheduleSecondaryLabel(entry)

                return (
                  <span
                    key={`${entry.time}-${entry.regional}-${index}`}
                    className="block"
                  >
                    <span className="block w-full truncate">
                      {getScheduleTimeLabel(entry)}
                    </span>
                    {secondaryLabel && (
                      <span className="mt-1 block w-full truncate">
                        {secondaryLabel}
                      </span>
                    )}
                  </span>
                )
              })}
              {daySchedule.length > visibleSchedule.length && (
                <span className="block">
                  +{daySchedule.length - visibleSchedule.length}
                </span>
              )}
            </>
          ) : (
            "N/C"
          )}
        </span>
      )}
    </CalendarDayButton>
  )
}

export function DashboardCalendar({
  operators,
  schedule,
  currentDate,
}: {
  operators: string[]
  schedule: OperatorSchedule
  currentDate: Date
}) {
  const currentYear = Number(
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      timeZone: CALENDAR_TIME_ZONE,
    }).format(currentDate)
  )
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    currentDate
  )
  const [selectedOperator, setSelectedOperator] = React.useState(() =>
    operators.includes("ECP15") ? "ECP15" : (operators[0] ?? "")
  )
  const [pastDaysBlurEnabled, setPastDaysBlurEnabled] = React.useState(true)
  const [operatorMenuOpen, setOperatorMenuOpen] = React.useState(false)
  const operatorMenuRef = React.useRef<HTMLDivElement>(null)
  const selectedSchedule = selectedDate
    ? (schedule[selectedOperator]?.[getDateKey(selectedDate)] ?? [])
    : []
  const operatorLabel = selectedOperator || "Selecionar operador"

  React.useEffect(() => {
    if (!operatorMenuOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !operatorMenuRef.current?.contains(event.target)
      ) {
        setOperatorMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOperatorMenuOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [operatorMenuOpen])

  return (
    <Card className="mx-1 w-full max-w-[420px] p-1">
      <CardContent className="p-0">
        <div ref={operatorMenuRef} className="relative px-3 pt-3">
          <Button
            type="button"
            variant="outline"
            aria-expanded={operatorMenuOpen}
            aria-haspopup="listbox"
            aria-label={`Operador selecionado: ${operatorLabel}`}
            onClick={() => setOperatorMenuOpen((open) => !open)}
            className="w-full justify-between"
          >
            <span className="truncate">{operatorLabel}</span>
            <ChevronDownIcon
              className={`size-4 shrink-0 transition-transform ${operatorMenuOpen ? "rotate-180" : ""}`}
            />
          </Button>
          {operatorMenuOpen && (
            <div
              role="listbox"
              aria-label="Operadores da escala"
              className="absolute top-full right-3 left-3 z-50 mt-1 max-h-[min(70vh,24rem)] overflow-y-auto rounded-3xl bg-popover p-1.5 text-popover-foreground shadow-lg ring-1 ring-foreground/10"
            >
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Operador da escala
              </p>
              {operators.map((operator) => {
                const isSelected = selectedOperator === operator
                return (
                  <button
                    key={operator}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setSelectedOperator(operator)
                      setOperatorMenuOpen(false)
                    }}
                    className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm font-medium transition-colors outline-none focus-visible:bg-accent ${
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/70"
                    }`}
                  >
                    <span>{operator}</span>
                    {isSelected && <CheckIcon className="size-4" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div className="flex justify-end px-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={pastDaysBlurEnabled}
            onClick={() => setPastDaysBlurEnabled((enabled) => !enabled)}
          >
            {pastDaysBlurEnabled
              ? "Mostrar dias anteriores"
              : "Ocultar dias anteriores"}
          </Button>
        </div>
        <CalendarDayPresentationContext.Provider
          value={{
            schedule,
            selectedOperator,
            currentDate,
            pastDaysBlurEnabled,
          }}
        >
          <Calendar
            mode="single"
            timeZone={CALENDAR_TIME_ZONE}
            today={currentDate}
            defaultMonth={currentDate}
            selected={selectedDate}
            onSelect={setSelectedDate}
            startMonth={new Date(Date.UTC(currentYear - 1, 0, 15, 12))}
            endMonth={new Date(Date.UTC(currentYear + 1, 11, 15, 12))}
            numberOfMonths={1}
            captionLayout="dropdown"
            locale={ptBR}
            className="w-full [--cell-size:--spacing(9)] max-[359px]:[--cell-size:--spacing(8)]"
            formatters={{
              formatMonthDropdown: (date) => {
                return date.toLocaleString("pt-BR", {
                  month: "long",
                  timeZone: CALENDAR_TIME_ZONE,
                })
              },
            }}
            components={{ DayButton: ScheduleCalendarDayButton }}
          />
        </CalendarDayPresentationContext.Provider>
        <section className="border-t px-4 py-3 text-sm">
          <p className="font-medium">
            {selectedDate?.toLocaleDateString("pt-BR", {
              dateStyle: "full",
              timeZone: CALENDAR_TIME_ZONE,
            })}
          </p>
          {selectedSchedule.length ? (
            selectedSchedule.map((entry, index) => (
              <p key={`${entry.time}-${entry.regional}-${index}`}>
                {getScheduleLabel(entry)}
              </p>
            ))
          ) : !selectedOperator ? (
            <p>Selecione ao menos um operador</p>
          ) : (
            <p>Não cadastrado</p>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
