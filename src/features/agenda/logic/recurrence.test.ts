import { describe, expect, it } from 'vitest'
import { expandOccurrences, parseRrule } from '../../../../supabase/functions/_shared/recurrence.ts'

const iso = (ms: number) => new Date(ms).toISOString()
const range = (a: string, b: string): [number, number] => [Date.parse(a), Date.parse(b)]

describe('parseRrule', () => {
  it('lee campos', () => {
    expect(parseRrule('RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=6')).toMatchObject({
      freq: 'WEEKLY',
      interval: 2,
      count: 6,
      byday: [{ n: null, wd: 1 }, { n: null, wd: 3 }],
    })
    expect(parseRrule('FREQ=SECONDLY')).toBeNull()
  })
})

describe('expandOccurrences', () => {
  it('sin RRULE devuelve la instancia si está en rango', () => {
    const ev = { starts_at: '2026-11-12T17:00:00.000Z', ends_at: '2026-11-12T18:00:00.000Z', all_day: false, rrule: null }
    expect(expandOccurrences(ev, ...range('2026-11-12T00:00:00Z', '2026-11-13T00:00:00Z'))).toHaveLength(1)
    expect(expandOccurrences(ev, ...range('2026-11-13T00:00:00Z', '2026-11-14T00:00:00Z'))).toHaveLength(0)
  })

  it('semanal con BYDAY y EXDATE', () => {
    const ev = {
      starts_at: '2026-11-09T08:00:00.000Z', // lunes 09:00 Madrid
      ends_at: '2026-11-09T09:00:00.000Z',
      all_day: false,
      rrule: 'FREQ=WEEKLY;BYDAY=MO,WE',
      exdates: ['2026-11-16T08:00:00.000Z'],
    }
    const occ = expandOccurrences(ev, ...range('2026-11-09T00:00:00Z', '2026-11-24T00:00:00Z'))
    expect(occ.map((o) => iso(o.start))).toEqual([
      '2026-11-09T08:00:00.000Z',
      '2026-11-11T08:00:00.000Z',
      '2026-11-18T08:00:00.000Z',
      '2026-11-23T08:00:00.000Z',
    ])
  })

  it('mantiene la hora de pared al cambiar el horario de verano', () => {
    const ev = {
      starts_at: '2026-10-19T08:00:00.000Z', // 10:00 Madrid (CEST)
      ends_at: '2026-10-19T09:00:00.000Z',
      all_day: false,
      rrule: 'FREQ=WEEKLY',
    }
    const occ = expandOccurrences(ev, ...range('2026-10-26T00:00:00Z', '2026-11-03T00:00:00Z'))
    expect(occ.map((o) => iso(o.start))).toEqual(['2026-10-26T09:00:00.000Z', '2026-11-02T09:00:00.000Z']) // CET: 10:00 = 09:00Z
  })

  it('COUNT y UNTIL', () => {
    const base = { starts_at: '2026-11-01T10:00:00.000Z', ends_at: null, all_day: false }
    const [f, t] = range('2026-11-01T00:00:00Z', '2027-01-01T00:00:00Z')
    expect(expandOccurrences({ ...base, rrule: 'FREQ=DAILY;COUNT=3' }, f, t)).toHaveLength(3)
    expect(expandOccurrences({ ...base, rrule: 'FREQ=DAILY;UNTIL=20261105T235959Z' }, f, t)).toHaveLength(5)
  })

  it('mensual por día del mes y por ordinal', () => {
    const [f, t] = range('2026-11-01T00:00:00Z', '2027-02-01T00:00:00Z')
    const monthly = { starts_at: '2026-11-31T00:00:00.000Z', ends_at: null, all_day: true, rrule: null as string | null }
    monthly.starts_at = '2026-11-30T00:00:00.000Z'
    monthly.rrule = 'FREQ=MONTHLY' // el 30: febrero no entra en el rango; enero sí
    expect(expandOccurrences(monthly, f, t).map((o) => iso(o.start).slice(0, 10))).toEqual(['2026-11-30', '2026-12-30', '2027-01-30'])
    const nth = { starts_at: '2026-11-06T00:00:00.000Z', ends_at: null, all_day: true, rrule: 'FREQ=MONTHLY;BYDAY=1FR' }
    expect(expandOccurrences(nth, f, t).map((o) => iso(o.start).slice(0, 10))).toEqual(['2026-11-06', '2026-12-04', '2027-01-01'])
    const last = { ...nth, rrule: 'FREQ=MONTHLY;BYDAY=-1FR' }
    expect(expandOccurrences(last, f, t).map((o) => iso(o.start).slice(0, 10))).toEqual(['2026-11-27', '2026-12-25', '2027-01-29'])
  })

  it('anual de todo el día', () => {
    const ev = { starts_at: '2020-12-24T00:00:00.000Z', ends_at: '2020-12-25T00:00:00.000Z', all_day: true, rrule: 'FREQ=YEARLY' }
    const occ = expandOccurrences(ev, ...range('2026-12-01T00:00:00Z', '2027-01-01T00:00:00Z'))
    expect(occ.map((o) => iso(o.start))).toEqual(['2026-12-24T00:00:00.000Z'])
  })
})
