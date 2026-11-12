// Parser y serializador de iCalendar (RFC 5545), suficiente para eventos VEVENT de iCloud.
import { TZ, zonedToUtcMs } from './time.ts'

export type ParsedEvent = {
  uid: string
  title: string
  starts_at: string // ISO UTC. Todo el día: 00:00 UTC del primer día
  ends_at: string | null // Todo el día: 00:00 UTC del día SIGUIENTE al último (DTEND exclusivo)
  all_day: boolean
  location: string | null
  notes: string | null
  rrule: string | null
  exdates: string[]
  recurrence_id: string | null
}

export type EventInput = {
  title: string
  starts_at: string
  ends_at: string | null
  all_day: boolean
  location?: string | null
  notes?: string | null
}

type Prop = { name: string; params: Record<string, string>; value: string }

export const unfold = (text: string) => text.replace(/\r?\n[ \t]/g, '')

export function unescapeText(v: string): string {
  return v.replace(/\\([nN,;\\])/g, (_m, c: string) => (c === 'n' || c === 'N' ? '\n' : c))
}

export function escapeText(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function splitOutsideQuotes(s: string, sep: string, limit = Infinity): string[] {
  const out: string[] = []
  let cur = ''
  let q = false
  for (const ch of s) {
    if (ch === '"') q = !q
    if (ch === sep && !q && out.length < limit - 1) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

export function parseProp(line: string): Prop | null {
  const [head, ...rest] = splitOutsideQuotes(line, ':', 2)
  if (rest.length === 0 || head === undefined) return null
  const [name, ...ps] = splitOutsideQuotes(head, ';')
  const params: Record<string, string> = {}
  for (const p of ps) {
    const i = p.indexOf('=')
    if (i > 0) params[p.slice(0, i).toUpperCase()] = p.slice(i + 1).replace(/^"|"$/g, '')
  }
  return { name: (name ?? '').toUpperCase(), params, value: rest.join(':') }
}

export type IcsDate = { ms: number; allDay: boolean }

/** DTSTART/DTEND/EXDATE/RECURRENCE-ID: UTC (Z), con TZID, flotante (→ Europe/Madrid) o VALUE=DATE. */
export function parseIcsDate(value: string, params: Record<string, string> = {}): IcsDate | null {
  const v = value.trim()
  let m = /^(\d{4})(\d{2})(\d{2})$/.exec(v)
  if (m) return { ms: Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!), allDay: true }
  m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(v)
  if (!m) return null
  const [y, mo, d, h, mi, s] = [+m[1]!, +m[2]!, +m[3]!, +m[4]!, +m[5]!, +m[6]!]
  if (m[7]) return { ms: Date.UTC(y, mo - 1, d, h, mi, s), allDay: false }
  return { ms: zonedToUtcMs(y, mo, d, h, mi, s, params.TZID ?? TZ), allDay: false }
}

/** DURATION tipo P1DT2H30M / PT45M / P2W → ms. */
export function parseDuration(v: string): number | null {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(v.trim())
  if (!m) return null
  const n = (x?: string) => (x ? Number(x) : 0)
  const ms = (((n(m[2]) * 7 + n(m[3])) * 24 + n(m[4])) * 60 + n(m[5])) * 60_000 + n(m[6]) * 1000
  return m[1] === '-' ? -ms : ms
}

/** Todos los VEVENT de un VCALENDAR. */
export function parseIcs(ics: string): ParsedEvent[] {
  const lines = unfold(ics).split(/\r?\n/)
  const events: ParsedEvent[] = []
  let cur: Prop[] | null = null
  let depth = 0 // anidamiento dentro del VEVENT (VALARM)
  for (const line of lines) {
    if (!line) continue
    if (cur === null) {
      if (/^BEGIN:VEVENT$/i.test(line)) {
        cur = []
        depth = 0
      }
      continue
    }
    if (/^BEGIN:/i.test(line)) {
      depth++
      continue
    }
    if (/^END:VEVENT$/i.test(line) && depth === 0) {
      const ev = buildEvent(cur)
      if (ev) events.push(ev)
      cur = null
      continue
    }
    if (/^END:/i.test(line)) {
      depth--
      continue
    }
    if (depth > 0) continue
    const p = parseProp(line)
    if (p) cur.push(p)
  }
  return events
}

function buildEvent(props: Prop[]): ParsedEvent | null {
  const first = (n: string) => props.find((p) => p.name === n)
  const ds = first('DTSTART')
  const uid = first('UID')?.value.trim()
  if (!ds || !uid) return null
  const start = parseIcsDate(ds.value, ds.params)
  if (!start) return null
  const allDay = start.allDay || ds.params.VALUE === 'DATE'
  let end: number | null = null
  const de = first('DTEND')
  const du = first('DURATION')
  if (de) end = parseIcsDate(de.value, de.params)?.ms ?? null
  else if (du) {
    const d = parseDuration(du.value)
    if (d !== null) end = start.ms + d
  }
  if (end === null && allDay) end = start.ms + 86_400_000
  const exdates: string[] = []
  for (const p of props.filter((x) => x.name === 'EXDATE'))
    for (const v of p.value.split(',')) {
      const d = parseIcsDate(v, p.params)
      if (d) exdates.push(new Date(d.ms).toISOString())
    }
  const rid = first('RECURRENCE-ID')
  const ridMs = rid ? parseIcsDate(rid.value, rid.params)?.ms : undefined
  const txt = (n: string) => {
    const v = first(n)?.value
    return v === undefined || v === '' ? null : unescapeText(v)
  }
  return {
    uid,
    title: txt('SUMMARY') ?? '',
    starts_at: new Date(start.ms).toISOString(),
    ends_at: end === null ? null : new Date(end).toISOString(),
    all_day: allDay,
    location: txt('LOCATION'),
    notes: txt('DESCRIPTION'),
    rrule: first('RRULE')?.value.trim() || null,
    exdates,
    recurrence_id: ridMs === undefined ? null : new Date(ridMs).toISOString(),
  }
}

/** El evento "principal" de un recurso .ics (sin RECURRENCE-ID); si solo hay excepciones, la primera. */
export function pickMaster(events: ParsedEvent[]): ParsedEvent | null {
  return events.find((e) => !e.recurrence_id) ?? events[0] ?? null
}

// ---------- Serialización ----------

/** Pliega a 75 octetos por línea (UTF-8) con CRLF + espacio. */
export function foldLine(line: string): string {
  const enc = new TextEncoder()
  if (enc.encode(line).length <= 75) return line
  const parts: string[] = []
  let cur = ''
  let bytes = 0
  let limit = 75
  for (const ch of line) {
    const b = enc.encode(ch).length
    if (bytes + b > limit) {
      parts.push(cur)
      cur = ''
      bytes = 0
      limit = 74 // el espacio inicial de continuación ocupa 1
    }
    cur += ch
    bytes += b
  }
  parts.push(cur)
  return parts.join('\r\n ')
}

const icsUtc = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const icsDay = (ms: number) => new Date(ms).toISOString().slice(0, 10).replace(/-/g, '')

/** Líneas de las propiedades editables (se escriben siempre en UTC o como fecha). */
export function eventPropLines(ev: EventInput, nowMs: number): string[] {
  const s = Date.parse(ev.starts_at)
  const e = ev.ends_at ? Date.parse(ev.ends_at) : null
  const lines = [`DTSTAMP:${icsUtc(nowMs)}`]
  if (ev.all_day) {
    lines.push(`DTSTART;VALUE=DATE:${icsDay(s)}`)
    lines.push(`DTEND;VALUE=DATE:${icsDay(e !== null && e > s ? e : s + 86_400_000)}`)
  } else {
    lines.push(`DTSTART:${icsUtc(s)}`)
    if (e !== null && e > s) lines.push(`DTEND:${icsUtc(e)}`)
  }
  lines.push(`SUMMARY:${escapeText(ev.title)}`)
  if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`)
  if (ev.notes) lines.push(`DESCRIPTION:${escapeText(ev.notes)}`)
  return lines
}

/** VCALENDAR nuevo con un VEVENT. */
export function serializeEvent(ev: EventInput & { uid: string }, nowMs: number = Date.now()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//gerard-os//caldav//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${ev.uid}`,
    ...eventPropLines(ev, nowMs),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

const REPLACED = new Set(['SUMMARY', 'DTSTART', 'DTEND', 'DURATION', 'LOCATION', 'DESCRIPTION', 'DTSTAMP', 'LAST-MODIFIED'])

/**
 * Actualiza un .ics existente conservando el resto de propiedades (alarmas, asistentes,
 * RRULE, excepciones…): solo reemplaza título, fechas, lugar y notas del evento principal.
 */
export function updateIcs(raw: string, ev: EventInput, nowMs: number = Date.now()): string {
  const lines = unfold(raw)
    .split(/\r?\n/)
    .filter((l) => l !== '')
  // Localiza el VEVENT principal (el primero sin RECURRENCE-ID de nivel superior).
  let target = -1
  for (let i = 0, start = -1, depth = 0, hasRid = false; i < lines.length; i++) {
    const l = lines[i]!
    if (start < 0) {
      if (/^BEGIN:VEVENT$/i.test(l)) {
        start = i
        depth = 0
        hasRid = false
      }
      continue
    }
    if (/^BEGIN:/i.test(l)) depth++
    else if (/^END:VEVENT$/i.test(l) && depth === 0) {
      if (!hasRid && target < 0) target = start
      start = -1
    } else if (/^END:/i.test(l)) depth--
    else if (depth === 0 && /^RECURRENCE-ID[;:]/i.test(l)) hasRid = true
  }
  if (target < 0) throw new Error('El .ics no contiene ningún VEVENT editable')
  const out: string[] = []
  let depth = 0
  let inTarget = false
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!
    if (i === target) {
      inTarget = true
      depth = 0
      out.push(l)
      continue
    }
    if (!inTarget) {
      out.push(l)
      continue
    }
    if (/^BEGIN:/i.test(l)) {
      depth++
      out.push(l)
    } else if (/^END:VEVENT$/i.test(l) && depth === 0) {
      out.push(...eventPropLines(ev, nowMs), l)
      inTarget = false
    } else if (/^END:/i.test(l)) {
      depth--
      out.push(l)
    } else if (depth === 0 && REPLACED.has(parseProp(l)?.name ?? '')) {
      // se sustituye al final del VEVENT
    } else out.push(l)
  }
  return out.map(foldLine).join('\r\n') + '\r\n'
}
