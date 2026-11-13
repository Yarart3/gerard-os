// Lógica pura de la importación desde Apple Salud (Edge Function `health`). Sin imports de Deno.
// Un Atajo de iOS envía los entrenos del Apple Watch; aquí se parsean de forma tolerante y se decide
// qué escribir en `workouts`.
//
// Decisiones:
// - El "día" de un entreno es el de su INICIO en Europe/Madrid, sin hora de corte (04:00): el servidor
//   no conoce el ajuste de la app y un entreno de madrugada cuenta en el día natural.
// - Hay como mucho un `workouts` por día para el Watch: los entrenos del mismo día se AGREGAN
//   (kcal y minutos sumados) y el resultado se ESCRIBE (no se suma a lo anterior). Por eso reenviar lo
//   mismo no duplica nada; el Atajo debe enviar TODOS los entrenos del día en cada ejecución.
import { localDateISO, TZ, zonedToUtcMs } from './time.ts'

export const MAX_WORKOUTS = 200

export type HealthWorkout = {
  start: number // instante UTC (ms)
  end: number | null
  durationMin: number | null
  type: string | null
  activeKcal: number
}

export type ParsedHealth = {
  workouts: HealthWorkout[]
  dayKcal: { date: string; kcal: number } | null
  skipped: number // entradas ignoradas por no tener fecha o kcal válidas
}

/** Número tolerante: 312, "312,5", "312.5 kcal". Sin separador de miles (la coma o el punto son decimales). */
export function parseNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string') return null
  const m = v.replace(/\s+/g, '').match(/^(-?\d+(?:[.,]\d+)?)(?:[a-zA-Z]+)?$/)
  if (!m) return null
  const n = Number(m[1]!.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const DATE_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:[.,]\d+)?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i

/** Fecha ISO (con "T" o espacio, con o sin zona: Z, +01:00, +0100, +01) → instante UTC en ms. Sin zona: hora de Madrid. */
export function parseInstant(v: unknown): number | null {
  if (typeof v !== 'string') return null
  const m = v.trim().match(DATE_RE)
  if (!m) return null
  const [y, mo, d, h, mi, s] = [m[1], m[2], m[3], m[4] ?? '0', m[5] ?? '0', m[6] ?? '0'].map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ]
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) return null
  const zone = m[7]
  let ms: number
  if (!zone) ms = zonedToUtcMs(y, mo, d, h, mi, s, TZ)
  else if (zone.toUpperCase() === 'Z') ms = Date.UTC(y, mo - 1, d, h, mi, s)
  else {
    const digits = zone.slice(1).replace(':', '')
    const sign = zone[0] === '-' ? -1 : 1
    const off = Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4) || 0)
    ms = Date.UTC(y, mo - 1, d, h, mi, s) - sign * off * 60_000
  }
  return Number.isNaN(ms) ? null : ms
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** "YYYY-MM-DD" válido, o null. También acepta una fecha con hora (se queda con su día en Madrid). */
function parseDay(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = parseInstant(v)
  if (t === null) return null
  return /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) ? v.trim() : localDateISO(t)
}

/**
 * Parsea el cuerpo. Tolera: `workouts` como objeto suelto o como lista, números en texto con coma y fechas con zona variada.
 * Las entradas inválidas se cuentan en `skipped`. Lanza Error si el cuerpo no es un objeto.
 */
export function parseHealthBody(raw: unknown, now: number = Date.now()): ParsedHealth {
  if (!isObj(raw)) throw new Error('El cuerpo debe ser un objeto JSON')
  // Forma plana (Atajo sin "Entrenamientos", solo energía activa reciente): { active_kcal, start?, duration_min?, type? }.
  // Sin `start` se toma el momento de la petición.
  const flat =
    (raw.workouts === undefined || raw.workouts === null) && raw.active_kcal !== undefined
      ? [{ ...raw, start: raw.start ?? new Date(now).toISOString(), type: raw.type ?? 'Energía activa' }]
      : null
  const list =
    flat ??
    (raw.workouts === undefined || raw.workouts === null
      ? []
      : Array.isArray(raw.workouts)
        ? raw.workouts
        : [raw.workouts])
  const workouts: HealthWorkout[] = []
  let skipped = 0
  for (const w of list.slice(0, MAX_WORKOUTS)) {
    if (!isObj(w)) {
      skipped++
      continue
    }
    const start = parseInstant(w.start)
    const kcal = parseNumber(w.active_kcal)
    if (start === null || kcal === null || kcal < 0) {
      skipped++
      continue
    }
    const end = parseInstant(w.end)
    let dur = parseNumber(w.duration_min)
    if ((dur === null || dur <= 0) && end !== null && end > start) dur = (end - start) / 60_000
    workouts.push({
      start,
      end,
      durationMin: dur !== null && dur > 0 ? Math.round(dur) : null,
      type: typeof w.type === 'string' && w.type.trim() ? w.type.trim().slice(0, 60) : null,
      activeKcal: Math.round(kcal * 10) / 10,
    })
  }
  skipped += Math.max(0, list.length - MAX_WORKOUTS)

  let dayKcal: ParsedHealth['dayKcal'] = null
  if (isObj(raw.active_kcal_day)) {
    const date = parseDay(raw.active_kcal_day.date)
    const kcal = parseNumber(raw.active_kcal_day.kcal)
    if (date && kcal !== null && kcal >= 0) dayKcal = { date, kcal: Math.round(kcal * 10) / 10 }
  }
  return { workouts, dayKcal, skipped }
}

/** Día (YYYY-MM-DD, Europe/Madrid, sin hora de corte) de un instante. */
export const madridDay = (ms: number) => localDateISO(ms, TZ)

export type DayAggregate = {
  date: string
  start: number // inicio más temprano
  durationMin: number | null
  activeKcal: number
  types: string[]
}

/** Agrupa los entrenos por día de Madrid sumando kcal y minutos. Orden por fecha. */
export function aggregateByDay(workouts: HealthWorkout[]): DayAggregate[] {
  const days = new Map<string, DayAggregate>()
  for (const w of workouts) {
    const date = madridDay(w.start)
    const d = days.get(date) ?? { date, start: w.start, durationMin: null, activeKcal: 0, types: [] }
    d.start = Math.min(d.start, w.start)
    d.activeKcal = Math.round((d.activeKcal + w.activeKcal) * 10) / 10
    if (w.durationMin !== null) d.durationMin = (d.durationMin ?? 0) + w.durationMin
    if (w.type && !d.types.includes(w.type)) d.types.push(w.type)
    days.set(date, d)
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export type ExistingWorkout = {
  id: string
  date: string
  watch_kcal: number | null
  duration_min: number | null
}

export type HealthAction =
  | {
      op: 'update'
      id: string
      date: string
      patch: { watch_kcal: number; duration_min?: number; health_synced_at: string }
    }
  | {
      op: 'create'
      date: string
      row: {
        date: string
        started_at: string
        duration_min: number | null
        watch_kcal: number
        kind: 'strength'
        notes: string
        finished_at: string
        health_synced_at: string
      }
    }

/**
 * Decide qué escribir. `existing` = workouts ya guardados de esos días (si hay varios el mismo día,
 * se usa el primero de la lista, que debe venir ordenada por created_at).
 * - Día con entreno: se pone `watch_kcal` (y `duration_min` solo si estaba vacío).
 * - Día sin entreno: se crea uno `kind='strength'` (el CHECK no existe y la app solo usa 'strength';
 *   el tipo real queda en las notas: «Apple Watch: Running»).
 * - `dayKcal` (energía activa de todo el día) solo rellena `watch_kcal` vacío de un entreno ya existente
 *   de ese día que no venga ya en `workouts`; nunca crea entrenos.
 * Idempotente: reenviar el mismo cuerpo produce el mismo estado (se reescribe el mismo valor).
 */
export function planHealth(
  parsed: ParsedHealth,
  existing: ExistingWorkout[],
  now: Date = new Date(),
): HealthAction[] {
  const stamp = now.toISOString()
  const byDate = new Map<string, ExistingWorkout>()
  for (const e of existing) if (!byDate.has(e.date)) byDate.set(e.date, e)

  const actions: HealthAction[] = []
  const covered = new Set<string>()
  for (const day of aggregateByDay(parsed.workouts)) {
    covered.add(day.date)
    const cur = byDate.get(day.date)
    if (cur) {
      actions.push({
        op: 'update',
        id: cur.id,
        date: day.date,
        patch: {
          watch_kcal: day.activeKcal,
          ...(cur.duration_min === null && day.durationMin !== null ? { duration_min: day.durationMin } : {}),
          health_synced_at: stamp,
        },
      })
    } else {
      actions.push({
        op: 'create',
        date: day.date,
        row: {
          date: day.date,
          started_at: new Date(day.start).toISOString(),
          duration_min: day.durationMin,
          watch_kcal: day.activeKcal,
          kind: 'strength',
          notes: day.types.length ? `Apple Watch: ${day.types.join(', ')}` : 'Apple Watch',
          // Un entreno del Watch llega ya terminado (si no, la app lo tomaría por uno en curso).
          finished_at:
            day.durationMin !== null
              ? new Date(new Date(day.start).getTime() + day.durationMin * 60_000).toISOString()
              : stamp,
          health_synced_at: stamp,
        },
      })
    }
  }
  if (parsed.dayKcal && !covered.has(parsed.dayKcal.date)) {
    const cur = byDate.get(parsed.dayKcal.date)
    if (cur && cur.watch_kcal === null)
      actions.push({
        op: 'update',
        id: cur.id,
        date: cur.date,
        patch: { watch_kcal: parsed.dayKcal.kcal, health_synced_at: stamp },
      })
  }
  return actions
}
