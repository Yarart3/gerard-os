// Expansión de eventos recurrentes (RRULE) en el cliente. Cubre DAILY/WEEKLY/MONTHLY/YEARLY con
// INTERVAL, COUNT, UNTIL, BYDAY (con ordinal en mensual), BYMONTHDAY, BYMONTH y EXDATE.
// No soporta excepciones por instancia (RECURRENCE-ID) ni BYSETPOS.
import { parseIcsDate } from './ics.ts'
import { TZ, utcToWall, zonedToUtcMs } from './time.ts'

export type RecurringEvent = {
  starts_at: string
  ends_at: string | null
  all_day: boolean
  rrule: string | null
  exdates?: string[] | null
}
export type Occurrence = { start: number; end: number } // ms UTC

type Rule = {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  interval: number
  count: number | null
  until: number | null
  byday: { n: number | null; wd: number }[] // wd: 1=lunes … 7=domingo
  bymonthday: number[]
  bymonth: number[]
}

const WD: Record<string, number> = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 7 }

export function parseRrule(text: string): Rule | null {
  const kv: Record<string, string> = {}
  for (const part of text.replace(/^RRULE:/i, '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0) kv[part.slice(0, i).toUpperCase()] = part.slice(i + 1)
  }
  const freq = kv.FREQ as Rule['freq'] | undefined
  if (!freq || !['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) return null
  let until: number | null = null
  if (kv.UNTIL) {
    const d = parseIcsDate(kv.UNTIL)
    if (d) until = d.allDay ? d.ms + 86_400_000 - 1 : d.ms
  }
  const nums = (v?: string) => (v ? v.split(',').map(Number).filter(Number.isFinite) : [])
  return {
    freq,
    interval: Math.max(1, Number(kv.INTERVAL) || 1),
    count: kv.COUNT ? Number(kv.COUNT) : null,
    until,
    byday: (kv.BYDAY ? kv.BYDAY.split(',') : []).flatMap((t) => {
      const m = /^([+-]?\d+)?(MO|TU|WE|TH|FR|SA|SU)$/i.exec(t.trim())
      return m ? [{ n: m[1] ? Number(m[1]) : null, wd: WD[m[2]!.toUpperCase()]! }] : []
    }),
    bymonthday: nums(kv.BYMONTHDAY),
    bymonth: nums(kv.BYMONTH),
  }
}

const DAY = 86_400_000
const civil = (y: number, m: number, d: number) => Math.floor(Date.UTC(y, m - 1, d) / DAY) // m: 1-12
const fromCivil = (c: number) => {
  const d = new Date(c * DAY)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }
}
const weekday = (c: number) => ((c + 3) % 7) + 1 // 1970-01-01 fue jueves (4)
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()

/** Fechas candidatas (días civiles) del periodo `k`, ordenadas. */
function periodDays(rule: Rule, base: { y: number; m: number; d: number }, k: number): number[] {
  const baseC = civil(base.y, base.m, base.d)
  const step = k * rule.interval
  switch (rule.freq) {
    case 'DAILY':
      return [baseC + step]
    case 'WEEKLY': {
      const monday = baseC - (weekday(baseC) - 1) + 7 * step
      const wds = rule.byday.length ? rule.byday.map((b) => b.wd) : [weekday(baseC)]
      return [...new Set(wds)].sort((a, b) => a - b).map((wd) => monday + wd - 1)
    }
    case 'MONTHLY': {
      const idx = base.y * 12 + (base.m - 1) + step
      const y = Math.floor(idx / 12)
      const m = (idx % 12) + 1
      const dim = daysInMonth(y, m)
      if (rule.byday.length) {
        const out: number[] = []
        for (const b of rule.byday) {
          const all: number[] = []
          for (let d = 1; d <= dim; d++) if (weekday(civil(y, m, d)) === b.wd) all.push(civil(y, m, d))
          if (b.n === null) out.push(...all)
          else {
            const pick = b.n > 0 ? all[b.n - 1] : all[all.length + b.n]
            if (pick !== undefined) out.push(pick)
          }
        }
        return [...new Set(out)].sort((a, b) => a - b)
      }
      const days = rule.bymonthday.length ? rule.bymonthday : [base.d]
      return days
        .map((d) => (d < 0 ? dim + 1 + d : d))
        .filter((d) => d >= 1 && d <= dim)
        .sort((a, b) => a - b)
        .map((d) => civil(y, m, d))
    }
    case 'YEARLY': {
      const y = base.y + step
      const months = rule.bymonth.length ? rule.bymonth : [base.m]
      const days = rule.bymonthday.length ? rule.bymonthday : [base.d]
      const out: number[] = []
      for (const m of months)
        for (const d of days) if (d >= 1 && d <= daysInMonth(y, m)) out.push(civil(y, m, d))
      return out.sort((a, b) => a - b)
    }
  }
}

/** Ocurrencias (ms UTC) que se solapan con [fromMs, toMs). Sin RRULE devuelve la instancia única. */
export function expandOccurrences(
  ev: RecurringEvent,
  fromMs: number,
  toMs: number,
  tz: string = TZ,
  maxIterations = 4000,
): Occurrence[] {
  const start = Date.parse(ev.starts_at)
  const end = ev.ends_at ? Date.parse(ev.ends_at) : start
  const dur = Math.max(0, end - start)
  const overlaps = (s: number) => (s + dur > fromMs && s < toMs) || (dur === 0 && s >= fromMs && s < toMs)
  const rule = ev.rrule ? parseRrule(ev.rrule) : null
  if (!rule) return overlaps(start) ? [{ start, end: start + dur }] : []

  const wall = ev.all_day ? null : utcToWall(start, tz)
  const baseDate = ev.all_day
    ? {
        y: new Date(start).getUTCFullYear(),
        m: new Date(start).getUTCMonth() + 1,
        d: new Date(start).getUTCDate(),
      }
    : { y: wall!.y, m: wall!.mo, d: wall!.d }
  const baseC = civil(baseDate.y, baseDate.m, baseDate.d)
  const ex = new Set((ev.exdates ?? []).map((x) => Date.parse(x)))
  const out: Occurrence[] = []
  let produced = 0
  for (let k = 0, guard = 0; guard < maxIterations; k++, guard++) {
    for (const c of periodDays(rule, baseDate, k)) {
      if (c < baseC) continue
      const { y, m, d } = fromCivil(c)
      const s = ev.all_day ? Date.UTC(y, m - 1, d) : zonedToUtcMs(y, m, d, wall!.h, wall!.mi, wall!.s, tz)
      if (rule.until !== null && s > rule.until) return out
      produced++
      if (rule.count !== null && produced > rule.count) return out
      if (s >= toMs) return out
      if (!ex.has(s) && overlaps(s)) out.push({ start: s, end: s + dur })
    }
  }
  return out
}
