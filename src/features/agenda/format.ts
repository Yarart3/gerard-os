import { TIME_ZONE } from '../../lib/format'

const time = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TIME_ZONE })

/** "18:30" en Europe/Madrid. */
export const formatTime = (ms: number) => time.format(new Date(ms))

const cap = (s: string) => s.charAt(0).toLocaleUpperCase('es-ES') + s.slice(1)

/** "Noviembre 2026" */
export const formatMonthYear = (iso: string) =>
  cap(new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`)))

/** "9 – 15 nov 2026" (o "28 oct – 3 nov 2026") */
export function formatWeekRange(from: string, to: string): string {
  const f = (iso: string, o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('es-ES', { ...o, timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`))
  const sameMonth = from.slice(0, 7) === to.slice(0, 7)
  return `${f(from, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' })} – ${f(to, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

/** "hace 3 min", "hace 2 h", "hace 1 día"; "ahora mismo" si < 1 min. */
export function formatAgo(thenMs: number, nowMs: number = Date.now()): string {
  const min = Math.max(0, Math.floor((nowMs - thenMs) / 60_000))
  if (min < 1) return 'ahora mismo'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`
}

/** Hora o "Todo el día" de un evento. */
export function eventTimeLabel(ev: { allDay: boolean; startMs: number; endMs: number }): string {
  if (ev.allDay) return 'Todo el día'
  return ev.endMs > ev.startMs ? `${formatTime(ev.startMs)} – ${formatTime(ev.endMs)}` : formatTime(ev.startMs)
}
