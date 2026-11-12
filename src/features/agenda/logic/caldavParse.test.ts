import { describe, expect, it } from 'vitest'
import {
  calendarQueryBody,
  multigetBody,
  normalizeColor,
  parseCalendarData,
  parseCalendarHomeHref,
  parseCalendarList,
  parseCtag,
  parseEtags,
  parsePrincipalHref,
  resolveHref,
} from '../../../../supabase/functions/_shared/caldavParse.ts'
import { parseXml } from '../../../../supabase/functions/_shared/xml.ts'

// Fixtures inventadas con la forma de las respuestas de iCloud.
const PRINCIPAL = `<?xml version="1.0" encoding="UTF-8"?>
<multistatus xmlns="DAV:"><response><href>/</href><propstat><prop><current-user-principal><href>/1234567890/principal/</href></current-user-principal></prop><status>HTTP/1.1 200 OK</status></propstat></response></multistatus>`

const HOME = `<?xml version="1.0" encoding="UTF-8"?>
<multistatus xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav"><response><href>/1234567890/principal/</href><propstat><prop><C:calendar-home-set><href>https://p42-caldav.icloud.com:443/1234567890/calendars/</href></C:calendar-home-set></prop><status>HTTP/1.1 200 OK</status></propstat></response></multistatus>`

const CALENDARS = `<?xml version="1.0" encoding="UTF-8"?>
<multistatus xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:CS="http://calendarserver.org/ns/" xmlns:A="http://apple.com/ns/ical/">
<response><href>/1234567890/calendars/</href><propstat><prop><resourcetype><collection/></resourcetype></prop><status>HTTP/1.1 200 OK</status></propstat></response>
<response><href>/1234567890/calendars/home/</href><propstat><prop>
<resourcetype><collection/><C:calendar/></resourcetype><displayname>Casa &amp; Uni</displayname>
<A:calendar-color>#FF2D55FF</A:calendar-color><CS:getctag>FT=-@RU=abc@S=12</CS:getctag>
<C:supported-calendar-component-set><C:comp name="VEVENT"/></C:supported-calendar-component-set>
</prop><status>HTTP/1.1 200 OK</status></propstat></response>
<response><href>/1234567890/calendars/reminders/</href><propstat><prop>
<resourcetype><collection/><C:calendar/></resourcetype><displayname>Recordatorios</displayname>
<C:supported-calendar-component-set><C:comp name="VTODO"/></C:supported-calendar-component-set>
</prop><status>HTTP/1.1 200 OK</status></propstat></response>
<response><href>/1234567890/calendars/inbox/</href><propstat><prop><resourcetype><collection/><C:schedule-inbox/></resourcetype></prop><status>HTTP/1.1 200 OK</status></propstat></response>
</multistatus>`

const ETAGS = `<?xml version="1.0"?>
<multistatus xmlns="DAV:"><response><href>/1234567890/calendars/home/a.ics</href><propstat><prop><getetag>"C=12@U=aaa"</getetag></prop><status>HTTP/1.1 200 OK</status></propstat></response>
<response><href>/1234567890/calendars/home/b.ics</href><propstat><prop><getetag>"C=3@U=bbb"</getetag></prop><status>HTTP/1.1 200 OK</status></propstat></response>
<response><href>/1234567890/calendars/home/gone.ics</href><status>HTTP/1.1 404 Not Found</status></response></multistatus>`

const DATA = `<?xml version="1.0"?>
<multistatus xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav"><response><href>/1234567890/calendars/home/a.ics</href><propstat><prop><getetag>"C=12@U=aaa"</getetag><C:calendar-data>BEGIN:VCALENDAR
BEGIN:VEVENT
UID:a
DTSTART:20261112T170000Z
SUMMARY:Reuni&amp;oacute;n &lt;importante&gt;
END:VEVENT
END:VCALENDAR
</C:calendar-data></prop><status>HTTP/1.1 200 OK</status></propstat></response></multistatus>`

describe('XML', () => {
  it('quita prefijos, decodifica entidades y lee CDATA y atributos', () => {
    const root = parseXml('<?xml version="1.0"?><!-- c --><d:a x="1 &amp; 2"><d:b>t&#233;&#x41;</d:b><d:c/><![CDATA[<raw>]]></d:a>')
    const a = root.children[0]!
    expect(a.name).toBe('a')
    expect(a.attrs.x).toBe('1 & 2')
    expect(a.children.map((c) => c.name)).toEqual(['b', 'c'])
    expect(a.children[0]!.text).toBe('téA')
    expect(a.text).toBe('<raw>')
  })
})

describe('descubrimiento', () => {
  it('principal y calendar-home-set', () => {
    expect(parsePrincipalHref(PRINCIPAL)).toBe('/1234567890/principal/')
    expect(parseCalendarHomeHref(HOME)).toBe('https://p42-caldav.icloud.com:443/1234567890/calendars/')
  })
  it('lista solo calendarios de eventos, con nombre, color y ctag', () => {
    expect(parseCalendarList(CALENDARS)).toEqual([
      { href: '/1234567890/calendars/home/', name: 'Casa & Uni', color: '#FF2D55', ctag: 'FT=-@RU=abc@S=12' },
    ])
  })
  it('resuelve hrefs relativos y absolutos', () => {
    const home = 'https://p42-caldav.icloud.com:443/1234567890/calendars/'
    expect(resolveHref(home, '/1234567890/calendars/home/')).toBe('https://p42-caldav.icloud.com/1234567890/calendars/home/')
    expect(resolveHref(home, 'https://x.icloud.com/y/')).toBe('https://x.icloud.com/y/')
  })
  it('colores', () => {
    expect(normalizeColor('#ff2d55ff')).toBe('#FF2D55')
    expect(normalizeColor('rojo')).toBeNull()
  })
})

describe('sincronización', () => {
  it('ctag', () => {
    const xml = `<multistatus xmlns="DAV:" xmlns:CS="http://calendarserver.org/ns/"><response><href>/c/</href><propstat><prop><CS:getctag>X1</CS:getctag></prop><status>HTTP/1.1 200 OK</status></propstat></response></multistatus>`
    expect(parseCtag(xml)).toBe('X1')
  })
  it('etags: ignora 404 y la colección', () => {
    expect(parseEtags(ETAGS)).toEqual([
      { href: '/1234567890/calendars/home/a.ics', etag: '"C=12@U=aaa"' },
      { href: '/1234567890/calendars/home/b.ics', etag: '"C=3@U=bbb"' },
    ])
  })
  it('calendar-data decodificado', () => {
    const [e] = parseCalendarData(DATA)
    expect(e!.href).toBe('/1234567890/calendars/home/a.ics')
    expect(e!.etag).toBe('"C=12@U=aaa"')
    expect(e!.ics).toContain('SUMMARY:Reuni&oacute;n <importante>')
  })
  it('cuerpos de petición', () => {
    const q = calendarQueryBody({ fromMs: Date.UTC(2026, 7, 1), toMs: Date.UTC(2027, 10, 1), withData: false })
    expect(q).toContain('<c:time-range start="20260801T000000Z" end="20271101T000000Z"/>')
    expect(q).not.toContain('calendar-data')
    expect(calendarQueryBody({})).not.toContain('time-range')
    expect(multigetBody(['/a b&c.ics'])).toContain('<d:href>/a b&amp;c.ics</d:href>')
  })
})
