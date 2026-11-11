import { TIME_ZONE } from './format'

// Fechas de calendario como texto ISO "YYYY-MM-DD" (sin hora). Semana de lunes a domingo.
const pad = (n: number) => String(n).padStart(2, '0')

/** Fecha de hoy en Europe/Madrid. */
export function todayISO(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function toISO(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1))
}

export function addDays(iso: string, days: number): string {
  const d = fromISO(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return toISO(d)
}

/** 1 = lunes … 7 = domingo. */
export function isoWeekday(iso: string): number {
  const wd = fromISO(iso).getUTCDay()
  return wd === 0 ? 7 : wd
}

/** Lunes de la semana de `iso`. */
export const weekStart = (iso: string) => addDays(iso, 1 - isoWeekday(iso))

export const weekDays = (iso: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(iso), i))

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('es-ES', { ...opts, timeZone: 'UTC' })

/** "lun, 9 nov" */
export const formatShortDate = (iso: string) =>
  fmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(fromISO(iso))

/** "lunes, 9 de noviembre" */
export const formatLongDate = (iso: string) =>
  fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(fromISO(iso))

/** "9 nov" */
export const formatDayMonth = (iso: string) => fmt({ day: 'numeric', month: 'short' }).format(fromISO(iso))

/** "lun" */
export const formatWeekdayShort = (iso: string) => fmt({ weekday: 'short' }).format(fromISO(iso))
