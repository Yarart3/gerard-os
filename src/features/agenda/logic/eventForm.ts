// Conversión entre los campos del formulario de evento (fecha y hora de Madrid) y lo que guarda iCloud.
import { addDays } from '../../../lib/dates'
import { TZ, localDateISO, utcDateISO, utcToWall, zonedToUtcMs } from '../../../../supabase/functions/_shared/time.ts'

export type EventForm = {
  title: string
  allDay: boolean
  startDate: string // YYYY-MM-DD
  startTime: string // HH:mm
  endDate: string // inclusive en todo el día
  endTime: string
  location: string
  notes: string
}

export type EventPayload = {
  title: string
  starts_at: string
  ends_at: string | null
  all_day: boolean
  location: string | null
  notes: string | null
}

const pad = (n: number) => String(n).padStart(2, '0')

function localMs(date: string, time: string): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const [h, mi] = (time || '00:00').split(':').map(Number) as [number, number]
  return zonedToUtcMs(y, m, d, h, mi, 0, TZ)
}

/** Formulario → datos para la función `caldav`. Devuelve un error de validación en castellano si no vale. */
export function formToPayload(f: EventForm): { payload: EventPayload } | { error: string } {
  const title = f.title.trim()
  if (!title) return { error: 'Escribe un título' }
  if (!f.startDate) return { error: 'Elige la fecha de inicio' }
  const endDate = f.endDate || f.startDate
  let starts: number
  let ends: number
  if (f.allDay) {
    starts = Date.parse(`${f.startDate}T00:00:00Z`)
    ends = Date.parse(`${addDays(endDate, 1)}T00:00:00Z`) // DTEND exclusivo
    if (ends <= starts) return { error: 'El final no puede ser anterior al inicio' }
  } else {
    starts = localMs(f.startDate, f.startTime)
    ends = localMs(endDate, f.endTime || f.startTime)
    if (ends < starts) return { error: 'El final no puede ser anterior al inicio' }
  }
  return {
    payload: {
      title,
      starts_at: new Date(starts).toISOString(),
      ends_at: new Date(ends).toISOString(),
      all_day: f.allDay,
      location: f.location.trim() || null,
      notes: f.notes.trim() || null,
    },
  }
}

type EventLike = {
  title: string
  starts_at: string
  ends_at: string | null
  all_day: boolean
  location: string | null
  notes: string | null
}

/** Fila de `events` → formulario (hora de Madrid; todo el día con final inclusive). */
export function eventToForm(e: EventLike): EventForm {
  const s = Date.parse(e.starts_at)
  const en = e.ends_at ? Date.parse(e.ends_at) : s
  if (e.all_day) {
    const last = addDays(utcDateISO(Math.max(en, s + 86_400_000)), -1)
    return {
      title: e.title,
      allDay: true,
      startDate: utcDateISO(s),
      startTime: '09:00',
      endDate: last,
      endTime: '10:00',
      location: e.location ?? '',
      notes: e.notes ?? '',
    }
  }
  const w = (ms: number) => {
    const x = utcToWall(ms, TZ)
    return `${pad(x.h)}:${pad(x.mi)}`
  }
  return {
    title: e.title,
    allDay: false,
    startDate: localDateISO(s),
    startTime: w(s),
    endDate: localDateISO(en),
    endTime: w(en),
    location: e.location ?? '',
    notes: e.notes ?? '',
  }
}

/** Formulario para un evento nuevo el día `date`, a partir de `hour` (hora de Madrid), de 1 h. */
export function newEventForm(date: string, hour = 10): EventForm {
  return {
    title: '',
    allDay: false,
    startDate: date,
    startTime: `${pad(hour)}:00`,
    endDate: date,
    endTime: `${pad((hour + 1) % 24)}:00`,
    location: '',
    notes: '',
  }
}
