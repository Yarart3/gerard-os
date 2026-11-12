// Construcción de peticiones y parseo de respuestas WebDAV/CalDAV (iCloud).
import { child, childrenNamed, escapeXml, parseXml, path, textOf, type XmlNode } from './xml.ts'

export const NS = 'xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:cs="http://calendarserver.org/ns/" xmlns:a="http://apple.com/ns/ical/"'
const HEAD = '<?xml version="1.0" encoding="utf-8"?>'

export const principalBody = `${HEAD}<d:propfind ${NS}><d:prop><d:current-user-principal/></d:prop></d:propfind>`
export const homeSetBody = `${HEAD}<d:propfind ${NS}><d:prop><c:calendar-home-set/></d:prop></d:propfind>`
export const calendarsBody = `${HEAD}<d:propfind ${NS}><d:prop><d:resourcetype/><d:displayname/><a:calendar-color/><cs:getctag/><c:supported-calendar-component-set/></d:prop></d:propfind>`
export const ctagBody = `${HEAD}<d:propfind ${NS}><d:prop><cs:getctag/></d:prop></d:propfind>`
export const etagBody = `${HEAD}<d:propfind ${NS}><d:prop><d:getetag/></d:prop></d:propfind>`

const icsStamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** REPORT calendar-query de VEVENT, con time-range opcional; con o sin datos ICS. */
export function calendarQueryBody(opts: { fromMs?: number; toMs?: number; withData?: boolean }): string {
  const range =
    opts.fromMs !== undefined && opts.toMs !== undefined
      ? `<c:time-range start="${icsStamp(opts.fromMs)}" end="${icsStamp(opts.toMs)}"/>`
      : ''
  return `${HEAD}<c:calendar-query ${NS}><d:prop><d:getetag/>${
    opts.withData ? '<c:calendar-data/>' : ''
  }</d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT">${range}</c:comp-filter></c:comp-filter></c:filter></c:calendar-query>`
}

export function multigetBody(hrefs: string[]): string {
  return `${HEAD}<c:calendar-multiget ${NS}><d:prop><d:getetag/><c:calendar-data/></d:prop>${hrefs
    .map((h) => `<d:href>${escapeXml(h)}</d:href>`)
    .join('')}</c:calendar-multiget>`
}

export type DavResponse = {
  href: string
  status: number | null // estado de la respuesta (p. ej. 404 en recursos borrados)
  props: Map<string, XmlNode> // propiedades con estado 2xx, por nombre local
}

const statusCode = (s: string) => Number(/\s(\d{3})\b/.exec(s)?.[1] ?? NaN)

/** Parsea un `multistatus` en una lista de respuestas. */
export function parseMultistatus(xml: string): DavResponse[] {
  const root = parseXml(xml)
  const ms = child(root, 'multistatus')
  return childrenNamed(ms, 'response').map((r) => {
    const props = new Map<string, XmlNode>()
    for (const ps of childrenNamed(r, 'propstat')) {
      const code = statusCode(textOf(child(ps, 'status')))
      if (code >= 200 && code < 300) {
        for (const p of child(ps, 'prop')?.children ?? []) props.set(p.name, p)
      }
    }
    const st = textOf(child(r, 'status'))
    return { href: textOf(child(r, 'href')), status: st ? statusCode(st) : null, props }
  })
}

export function parsePrincipalHref(xml: string): string | null {
  for (const r of parseMultistatus(xml)) {
    const h = textOf(path(r.props.get('current-user-principal'), 'href'))
    if (h) return h
  }
  return null
}

export function parseCalendarHomeHref(xml: string): string | null {
  for (const r of parseMultistatus(xml)) {
    const h = textOf(path(r.props.get('calendar-home-set'), 'href'))
    if (h) return h
  }
  return null
}

export type CalendarInfo = { href: string; name: string; color: string | null; ctag: string | null }

/** "#FF2D55FF" (RRGGBBAA) → "#FF2D55". */
export function normalizeColor(raw: string): string | null {
  const m = /^#?([0-9a-fA-F]{6})(?:[0-9a-fA-F]{2})?$/.exec(raw.trim())
  return m ? `#${m[1]!.toUpperCase()}` : null
}

/** Colecciones de calendario con soporte de VEVENT (descarta Recordatorios, buzones, etc.). */
export function parseCalendarList(xml: string): CalendarInfo[] {
  const out: CalendarInfo[] = []
  for (const r of parseMultistatus(xml)) {
    const rt = r.props.get('resourcetype')
    if (!rt || !child(rt, 'calendar')) continue
    const comps = r.props.get('supported-calendar-component-set')
    if (comps && !childrenNamed(comps, 'comp').some((c) => (c.attrs.name ?? '').toUpperCase() === 'VEVENT')) continue
    out.push({
      href: r.href,
      name: textOf(r.props.get('displayname')) || 'Calendario',
      color: normalizeColor(textOf(r.props.get('calendar-color'))),
      ctag: textOf(r.props.get('getctag')) || null,
    })
  }
  return out
}

export function parseCtag(xml: string): string | null {
  for (const r of parseMultistatus(xml)) {
    const c = textOf(r.props.get('getctag'))
    if (c) return c
  }
  return null
}

export type EtagEntry = { href: string; etag: string }

/** href + etag de cada recurso (ignora la colección en sí y los 404). */
export function parseEtags(xml: string): EtagEntry[] {
  return parseMultistatus(xml)
    .filter((r) => r.status !== 404 && r.props.has('getetag'))
    .map((r) => ({ href: r.href, etag: textOf(r.props.get('getetag')) }))
    .filter((e) => e.href && e.etag)
}

export type CalendarDataEntry = { href: string; etag: string; ics: string }

export function parseCalendarData(xml: string): CalendarDataEntry[] {
  return parseMultistatus(xml)
    .filter((r) => r.status !== 404 && r.props.has('calendar-data'))
    .map((r) => ({
      href: r.href,
      etag: textOf(r.props.get('getetag')),
      ics: r.props.get('calendar-data')!.text.trim(),
    }))
    .filter((e) => e.ics)
}

/** URL absoluta de un href (que puede ser ruta o URL completa) respecto a una base. */
export const resolveHref = (base: string, href: string) => new URL(href, base).href
