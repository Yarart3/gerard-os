import { TIME_ZONE } from './format'

// Fechas de calendario como texto ISO "YYYY-MM-DD" (sin hora). Semana de lunes a domingo.
const pad = (n: number) => String(n).padStart(2, '0')

type Wall = { date: string; minutes: number }

/** Fecha y minutos desde medianoche en Europe/Madrid (el reloj de pared, DST incluido). */
function madridWall(now: Date): Wall {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  }
}

/** Fecha de calendario en Europe/Madrid (sin hora de corte): para marcas de tiempo, no para "hoy". */
export const madridDateISO = (now: Date = new Date()): string => madridWall(now).date

/** Hora de corte por defecto (04:00), en minutos desde medianoche. */
export const DEFAULT_CUTOFF_MIN = 4 * 60

/** "HH:MM" -> minutos (0–1439); null si no es válido. */
export function parseCutoff(hhmm: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm ?? '').trim())
  if (!m) return null
  const h = Number(m[1])
  const mi = Number(m[2])
  return h < 24 && mi < 60 ? h * 60 + mi : null
}

/** Día del usuario: antes de la hora de corte (Europe/Madrid) todavía cuenta como el día anterior. */
export function dayISO(now: Date, cutoffMin: number): string {
  const w = madridWall(now)
  return w.minutes < cutoffMin ? addDays(w.date, -1) : w.date
}

// La hora de corte es un ajuste del usuario (sección 'today'). Se guarda también en localStorage
// para que esté disponible de forma síncrona al arrancar; CutoffSync la mantiene al día.
const CUTOFF_KEY = 'hub.dayCutoff'
let cutoffMin = readStoredCutoff()
const listeners = new Set<() => void>()

function readStoredCutoff(): number {
  try {
    const v = Number(localStorage.getItem(CUTOFF_KEY))
    if (localStorage.getItem(CUTOFF_KEY) !== null && Number.isInteger(v) && v >= 0 && v < 1440) return v
  } catch {
    /* sin almacenamiento */
  }
  return DEFAULT_CUTOFF_MIN
}

export const getDayCutoff = () => cutoffMin

export function setDayCutoff(min: number) {
  if (min === cutoffMin) return
  cutoffMin = min
  try {
    localStorage.setItem(CUTOFF_KEY, String(min))
  } catch {
    /* sin almacenamiento */
  }
  listeners.forEach((l) => l())
}

export function subscribeDayCutoff(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** "Hoy" del usuario en Europe/Madrid, con la hora de corte configurada. */
export function todayISO(now: Date = new Date(), cutoff: number = cutoffMin): string {
  return dayISO(now, cutoff)
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
