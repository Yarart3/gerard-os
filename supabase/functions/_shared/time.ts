// Utilidades de zona horaria sin dependencias (Intl). Lógica pura compartida entre
// la Edge Function `caldav` (Deno) y el frontend (Vite/Vitest). Sin imports ni globals de Deno.
export const TZ = 'Europe/Madrid'

export type Wall = { y: number; mo: number; d: number; h: number; mi: number; s: number } // mo: 1-12

const cache = new Map<string, Intl.DateTimeFormat | null>()

function formatter(tz: string): Intl.DateTimeFormat | null {
  if (cache.has(tz)) return cache.get(tz) ?? null
  let f: Intl.DateTimeFormat | null = null
  try {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
  } catch {
    f = null
  }
  cache.set(tz, f)
  return f
}

export const isValidTz = (tz: string) => formatter(tz) !== null

/** Hora de pared en `tz` de un instante UTC (ms). */
export function utcToWall(ms: number, tz: string = TZ): Wall {
  const f = formatter(tz) ?? formatter(TZ)!
  const get: Record<string, number> = {}
  for (const p of f.formatToParts(new Date(ms))) if (p.type !== 'literal') get[p.type] = Number(p.value)
  return { y: get.year!, mo: get.month!, d: get.day!, h: get.hour! % 24, mi: get.minute!, s: get.second! }
}

/** Desfase (hora de pared − UTC) en ms de `tz` en el instante `ms`. */
export function tzOffsetMs(ms: number, tz: string = TZ): number {
  const w = utcToWall(ms, tz)
  return Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s) - Math.floor(ms / 1000) * 1000
}

/** Hora de pared en `tz` → instante UTC (ms). Tz desconocida → Europe/Madrid. */
export function zonedToUtcMs(
  y: number,
  mo: number, // 1-12
  d: number,
  h: number,
  mi: number,
  s: number,
  tz: string = TZ,
): number {
  const zone = isValidTz(tz) ? tz : TZ
  const guess = Date.UTC(y, mo - 1, d, h, mi, s)
  const off1 = tzOffsetMs(guess, zone)
  let t = guess - off1
  const off2 = tzOffsetMs(t, zone)
  if (off2 !== off1) t = guess - off2
  return t
}

const pad = (n: number, l = 2) => String(n).padStart(l, '0')

/** "YYYY-MM-DD" de un instante visto en `tz`. */
export function localDateISO(ms: number, tz: string = TZ): string {
  const w = utcToWall(ms, tz)
  return `${pad(w.y, 4)}-${pad(w.mo)}-${pad(w.d)}`
}

/** "YYYY-MM-DD" de un instante UTC (para eventos de todo el día, guardados a las 00:00 UTC). */
export const utcDateISO = (ms: number) => new Date(ms).toISOString().slice(0, 10)
