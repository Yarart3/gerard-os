// Eventos listos para pintar: expansión de recurrentes, entregas de la uni y reparto por días.
import { addDays } from '../../../lib/dates'
import { expandOccurrences } from '../../../../supabase/functions/_shared/recurrence.ts'
import { localDateISO, utcDateISO } from '../../../../supabase/functions/_shared/time.ts'
import { dayBoundsMs } from './grid'

export type EventRowLike = {
  id: string
  calendar_id: string
  title: string
  starts_at: string
  ends_at: string | null
  all_day: boolean
  location: string | null
  rrule: string | null
  exdates: string[] | null
}

export type DeadlineLike = {
  id: string
  title: string
  due_at: string
  kind: string
  done: boolean
  subject_id: string | null
}

export type DisplayEvent = {
  key: string
  id: string // id de la fila de origen (events o deadlines)
  kind: 'event' | 'deadline'
  title: string
  startMs: number
  endMs: number // todo el día: 00:00 UTC del día siguiente al último (exclusivo)
  allDay: boolean
  color: string
  calendarId: string | null
  location: string | null
  recurring: boolean
  done?: boolean
}

export const DEFAULT_COLOR = '#0071E3'

/** Eventos de iCloud (con sus repeticiones) que caen en [fromISO, toISO] (días inclusive). */
export function buildEvents(
  rows: readonly EventRowLike[],
  colorOf: (calendarId: string) => string | undefined,
  fromISO: string,
  toISO: string,
): DisplayEvent[] {
  const fromMs = dayBoundsMs(fromISO)[0]
  const toMs = dayBoundsMs(toISO)[1]
  const out: DisplayEvent[] = []
  for (const r of rows) {
    const color = colorOf(r.calendar_id) ?? DEFAULT_COLOR
    // Todo el día se guarda a las 00:00 UTC: se compara contra los mismos días en UTC.
    const [f, t] = r.all_day ? [Date.parse(`${fromISO}T00:00:00Z`), Date.parse(`${toISO}T00:00:00Z`) + 86_400_000] : [fromMs, toMs]
    for (const o of expandOccurrences(r, f, t)) {
      out.push({
        key: `${r.id}@${o.start}`,
        id: r.id,
        kind: 'event',
        title: r.title || '(Sin título)',
        startMs: o.start,
        endMs: o.end,
        allDay: r.all_day,
        color,
        calendarId: r.calendar_id,
        location: r.location,
        recurring: Boolean(r.rrule),
      })
    }
  }
  return out
}

/** Entregas y exámenes como eventos de todo el día (solo en la app). */
export function deadlineEvents(
  rows: readonly DeadlineLike[],
  colorOf: (subjectId: string | null) => string | undefined,
): DisplayEvent[] {
  return rows.map((d) => {
    const day = Date.parse(`${localDateISO(Date.parse(d.due_at))}T00:00:00Z`)
    return {
      key: `d:${d.id}`,
      id: d.id,
      kind: 'deadline',
      title: `${d.kind === 'exam' ? 'Examen' : 'Entrega'}: ${d.title}`,
      startMs: day,
      endMs: day + 86_400_000,
      allDay: true,
      color: colorOf(d.subject_id) ?? 'var(--orange)',
      calendarId: null,
      location: null,
      recurring: false,
      done: d.done,
    }
  })
}

/** ¿El evento toca el día `iso` (Europe/Madrid)? */
export function occursOn(ev: DisplayEvent, iso: string): boolean {
  if (ev.allDay) {
    const first = utcDateISO(ev.startMs)
    const lastExcl = utcDateISO(Math.max(ev.endMs, ev.startMs + 86_400_000))
    return iso >= first && iso < lastExcl
  }
  const [a, b] = dayBoundsMs(iso)
  return ev.startMs < b && (ev.endMs > a || (ev.endMs === ev.startMs && ev.startMs >= a))
}

/** Eventos de un día: primero los de todo el día, luego por hora de inicio. */
export function eventsOnDay(list: readonly DisplayEvent[], iso: string): DisplayEvent[] {
  return list
    .filter((e) => occursOn(e, iso))
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.startMs - b.startMs || a.title.localeCompare(b.title))
}

/** Reparte los eventos por día para una lista de días. */
export function groupByDay(list: readonly DisplayEvent[], days: readonly string[]): Map<string, DisplayEvent[]> {
  return new Map(days.map((d) => [d, eventsOnDay(list, d)]))
}

/** Último día (inclusive) de un evento de todo el día. */
export const lastAllDayISO = (ev: DisplayEvent) => addDays(utcDateISO(Math.max(ev.endMs, ev.startMs + 86_400_000)), -1)
