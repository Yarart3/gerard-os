import { describe, expect, it } from 'vitest'
import {
  escapeText,
  foldLine,
  parseDuration,
  parseIcs,
  parseIcsDate,
  pickMaster,
  serializeEvent,
  unescapeText,
  unfold,
  updateIcs,
} from '../../../../supabase/functions/_shared/ics.ts'
import { zonedToUtcMs } from '../../../../supabase/functions/_shared/time.ts'

const wrap = (body: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body}END:VCALENDAR\r\n`

describe('zona horaria', () => {
  it('convierte Madrid a UTC en verano e invierno', () => {
    expect(new Date(zonedToUtcMs(2026, 7, 15, 10, 0, 0)).toISOString()).toBe('2026-07-15T08:00:00.000Z')
    expect(new Date(zonedToUtcMs(2026, 1, 15, 10, 0, 0)).toISOString()).toBe('2026-01-15T09:00:00.000Z')
  })
  it('respeta el cambio de hora de octubre', () => {
    expect(new Date(zonedToUtcMs(2026, 10, 25, 1, 0, 0)).toISOString()).toBe('2026-10-24T23:00:00.000Z')
    expect(new Date(zonedToUtcMs(2026, 10, 25, 4, 0, 0)).toISOString()).toBe('2026-10-25T03:00:00.000Z')
  })
})

describe('parseIcsDate', () => {
  it('UTC', () => {
    expect(parseIcsDate('20261112T170000Z')).toEqual({ ms: Date.UTC(2026, 10, 12, 17), allDay: false })
  })
  it('con TZID', () => {
    const d = parseIcsDate('20261112T180000', { TZID: 'Europe/Madrid' })
    expect(new Date(d!.ms).toISOString()).toBe('2026-11-12T17:00:00.000Z')
  })
  it('TZID desconocida o flotante: Europe/Madrid', () => {
    expect(new Date(parseIcsDate('20260715T100000', { TZID: 'Nowhere/Land' })!.ms).toISOString()).toBe(
      '2026-07-15T08:00:00.000Z',
    )
    expect(new Date(parseIcsDate('20260715T100000')!.ms).toISOString()).toBe('2026-07-15T08:00:00.000Z')
  })
  it('todo el día', () => {
    expect(parseIcsDate('20261112')).toEqual({ ms: Date.UTC(2026, 10, 12), allDay: true })
  })
  it('basura → null', () => expect(parseIcsDate('mañana')).toBeNull())
})

describe('parseDuration', () => {
  it('formatos habituales', () => {
    expect(parseDuration('PT1H30M')).toBe(5_400_000)
    expect(parseDuration('P1DT2H')).toBe(93_600_000)
    expect(parseDuration('P2W')).toBe(14 * 86_400_000)
    expect(parseDuration('x')).toBeNull()
  })
})

describe('texto', () => {
  it('escapa y desescapa', () => {
    const raw = 'Aula 3, piso 2; ver \\ notas\nlínea 2'
    expect(unescapeText(escapeText(raw))).toBe(raw)
    expect(escapeText('a,b;c')).toBe('a\\,b\\;c')
  })
  it('pliega a 75 octetos y se puede deshacer', () => {
    const long = 'SUMMARY:' + 'ñandú '.repeat(40)
    const folded = foldLine(long)
    for (const l of folded.split('\r\n')) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75)
    expect(unfold(folded)).toBe(long)
  })
})

describe('parseIcs', () => {
  it('evento con TZID, escapes y line folding', () => {
    const ics = wrap(
      [
        'BEGIN:VEVENT',
        'UID:abc-1',
        'DTSTART;TZID=Europe/Madrid:20261112T180000',
        'DTEND;TZID=Europe/Madrid:20261112T193000',
        'SUMMARY:Clase de Redes\\, grupo 2',
        'LOCATION:Aula 3\\; edificio B',
        'DESCRIPTION:Primera línea\\nSegunda línea que es larguísima y se pl',
        ' iega en dos líneas',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:Recordatorio',
        'END:VALARM',
        'END:VEVENT',
        '',
      ].join('\r\n'),
    )
    const [e] = parseIcs(ics)
    expect(e).toMatchObject({
      uid: 'abc-1',
      title: 'Clase de Redes, grupo 2',
      starts_at: '2026-11-12T17:00:00.000Z',
      ends_at: '2026-11-12T18:30:00.000Z',
      all_day: false,
      location: 'Aula 3; edificio B',
      rrule: null,
    })
    expect(e!.notes).toBe('Primera línea\nSegunda línea que es larguísima y se pliega en dos líneas')
  })

  it('todo el día: DTEND exclusivo y sin DTEND', () => {
    const ics = wrap(
      'BEGIN:VEVENT\r\nUID:a\r\nDTSTART;VALUE=DATE:20261224\r\nDTEND;VALUE=DATE:20261227\r\nSUMMARY:Vacaciones\r\nEND:VEVENT\r\n' +
        'BEGIN:VEVENT\r\nUID:b\r\nDTSTART;VALUE=DATE:20261225\r\nSUMMARY:Navidad\r\nEND:VEVENT\r\n',
    )
    const [a, b] = parseIcs(ics)
    expect(a).toMatchObject({ all_day: true, starts_at: '2026-12-24T00:00:00.000Z', ends_at: '2026-12-27T00:00:00.000Z' })
    expect(b).toMatchObject({ all_day: true, ends_at: '2026-12-26T00:00:00.000Z' })
  })

  it('DURATION, RRULE, EXDATE y RECURRENCE-ID', () => {
    const ics = wrap(
      'BEGIN:VEVENT\r\nUID:r\r\nDTSTART:20261109T080000Z\r\nDURATION:PT1H\r\nRRULE:FREQ=WEEKLY;BYDAY=MO\r\nEXDATE:20261116T080000Z,20261123T080000Z\r\nSUMMARY:Gym\r\nEND:VEVENT\r\n' +
        'BEGIN:VEVENT\r\nUID:r\r\nRECURRENCE-ID:20261130T080000Z\r\nDTSTART:20261130T090000Z\r\nSUMMARY:Gym tarde\r\nEND:VEVENT\r\n',
    )
    const evs = parseIcs(ics)
    expect(evs).toHaveLength(2)
    const m = pickMaster(evs)!
    expect(m.title).toBe('Gym')
    expect(m.rrule).toBe('FREQ=WEEKLY;BYDAY=MO')
    expect(m.ends_at).toBe('2026-11-09T09:00:00.000Z')
    expect(m.exdates).toEqual(['2026-11-16T08:00:00.000Z', '2026-11-23T08:00:00.000Z'])
    expect(evs[1]!.recurrence_id).toBe('2026-11-30T08:00:00.000Z')
  })

  it('ignora VEVENT sin UID o DTSTART', () => {
    expect(parseIcs(wrap('BEGIN:VEVENT\r\nSUMMARY:x\r\nEND:VEVENT\r\n'))).toEqual([])
  })
})

describe('serializeEvent', () => {
  const now = Date.UTC(2026, 10, 12, 12)
  it('evento con hora: UTC y escapes, ida y vuelta', () => {
    const ics = serializeEvent(
      {
        uid: 'u1',
        title: 'Cena, con amigos',
        starts_at: '2026-11-12T19:00:00.000Z',
        ends_at: '2026-11-12T21:00:00.000Z',
        all_day: false,
        location: 'Casa; Barcelona',
        notes: 'Llevar postre\nY vino',
      },
      now,
    )
    expect(ics).toContain('DTSTART:20261112T190000Z')
    expect(ics).toContain('DTSTAMP:20261112T120000Z')
    expect(ics.endsWith('\r\n')).toBe(true)
    const [e] = parseIcs(ics)
    expect(e).toMatchObject({
      uid: 'u1',
      title: 'Cena, con amigos',
      starts_at: '2026-11-12T19:00:00.000Z',
      ends_at: '2026-11-12T21:00:00.000Z',
      location: 'Casa; Barcelona',
      notes: 'Llevar postre\nY vino',
    })
  })
  it('todo el día usa VALUE=DATE', () => {
    const ics = serializeEvent(
      { uid: 'u2', title: 'Examen', starts_at: '2026-12-01T00:00:00.000Z', ends_at: '2026-12-02T00:00:00.000Z', all_day: true },
      now,
    )
    expect(ics).toContain('DTSTART;VALUE=DATE:20261201')
    expect(ics).toContain('DTEND;VALUE=DATE:20261202')
    expect(parseIcs(ics)[0]).toMatchObject({ all_day: true, ends_at: '2026-12-02T00:00:00.000Z' })
  })
  it('pliega títulos largos', () => {
    const ics = serializeEvent(
      { uid: 'u3', title: 'x'.repeat(200), starts_at: '2026-11-12T19:00:00.000Z', ends_at: null, all_day: false },
      now,
    )
    for (const l of ics.split('\r\n')) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75)
    expect(parseIcs(ics)[0]!.title).toHaveLength(200)
  })
})

describe('updateIcs', () => {
  const raw = wrap(
    [
      'BEGIN:VEVENT',
      'UID:keep',
      'DTSTAMP:20260101T000000Z',
      'DTSTART;TZID=Europe/Madrid:20261112T180000',
      'DTEND;TZID=Europe/Madrid:20261112T190000',
      'SUMMARY:Antiguo',
      'LOCATION:Aula 1',
      'RRULE:FREQ=WEEKLY',
      'ATTENDEE:mailto:otra@example.com',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Aviso',
      'TRIGGER:-PT15M',
      'END:VALARM',
      'END:VEVENT',
      '',
    ].join('\r\n'),
  )
  it('cambia lo editable y conserva alarmas, asistentes y RRULE', () => {
    const out = updateIcs(
      raw,
      { title: 'Nuevo', starts_at: '2026-11-12T10:00:00.000Z', ends_at: '2026-11-12T11:00:00.000Z', all_day: false, location: null },
      Date.UTC(2026, 10, 12),
    )
    expect(out).toContain('ATTENDEE:mailto:otra@example.com')
    expect(out).toContain('RRULE:FREQ=WEEKLY')
    expect(out).toContain('DESCRIPTION:Aviso')
    expect(out).toContain('TRIGGER:-PT15M')
    expect(out).not.toContain('Antiguo')
    expect(out).not.toContain('Aula 1')
    const [e] = parseIcs(out)
    expect(e).toMatchObject({ uid: 'keep', title: 'Nuevo', starts_at: '2026-11-12T10:00:00.000Z', rrule: 'FREQ=WEEKLY', location: null })
  })
  it('falla si no hay VEVENT', () => {
    expect(() => updateIcs(wrap(''), { title: 'x', starts_at: '2026-11-12T10:00:00.000Z', ends_at: null, all_day: false })).toThrow()
  })
})
