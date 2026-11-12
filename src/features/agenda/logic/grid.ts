// Rejilla del calendario (mes, semana, día). Fechas como "YYYY-MM-DD"; semana lunes-domingo
// (o domingo-sábado si se elige en Ajustes).
import { addDays, fromISO, isoWeekday, toISO } from '../../../lib/dates'
import { TZ, zonedToUtcMs } from '../../../../supabase/functions/_shared/time.ts'

export type CalView = 'month' | 'week' | 'day'
export type FirstDay = 1 | 7 // 1 = lunes, 7 = domingo

/** Primer día de la semana que contiene `iso`. */
export function startOfWeek(iso: string, firstDay: FirstDay = 1): string {
  const back = (isoWeekday(iso) - firstDay + 7) % 7
  return addDays(iso, -back)
}

export const weekOf = (iso: string, firstDay: FirstDay = 1): string[] =>
  Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(iso, firstDay), i))

export const startOfMonth = (iso: string) => `${iso.slice(0, 7)}-01`

export function endOfMonth(iso: string): string {
  const d = fromISO(startOfMonth(iso))
  return toISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)))
}

/** Semanas (filas de 7 días) que cubren el mes de `iso`: 4 a 6 filas. */
export function monthGrid(iso: string, firstDay: FirstDay = 1): string[][] {
  const last = endOfMonth(iso)
  const rows: string[][] = []
  let cur = startOfWeek(startOfMonth(iso), firstDay)
  while (cur <= last) {
    rows.push(weekOf(cur, firstDay))
    cur = addDays(cur, 7)
  }
  return rows
}

export function addMonths(iso: string, n: number): string {
  const d = fromISO(iso)
  const day = d.getUTCDate()
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1))
  const dim = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  first.setUTCDate(Math.min(day, dim))
  return toISO(first)
}

/** Mueve la fecha ancla una unidad de la vista (mes/semana/día). */
export function shiftAnchor(view: CalView, iso: string, dir: 1 | -1): string {
  if (view === 'month') return addMonths(iso, dir)
  return addDays(iso, dir * (view === 'week' ? 7 : 1))
}

/** Días visibles (primero y último, inclusive) de una vista. */
export function viewRange(view: CalView, iso: string, firstDay: FirstDay = 1): { from: string; to: string } {
  if (view === 'day') return { from: iso, to: iso }
  if (view === 'week') {
    const w = weekOf(iso, firstDay)
    return { from: w[0]!, to: w[6]! }
  }
  const g = monthGrid(iso, firstDay)
  return { from: g[0]![0]!, to: g[g.length - 1]![6]! }
}

/** [inicio, fin) del día en Europe/Madrid, en ms UTC. */
export function dayBoundsMs(iso: string): [number, number] {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  const next = addDays(iso, 1).split('-').map(Number) as [number, number, number]
  return [zonedToUtcMs(y, m, d, 0, 0, 0, TZ), zonedToUtcMs(next[0], next[1], next[2], 0, 0, 0, TZ)]
}
