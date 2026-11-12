import { describe, expect, it } from 'vitest'
import { buildEvents, deadlineEvents, eventsOnDay, groupByDay, occursOn, type EventRowLike } from './events'
import { addMonths, dayBoundsMs, endOfMonth, monthGrid, shiftAnchor, startOfWeek, viewRange, weekOf } from './grid'

describe('rejilla', () => {
  it('la semana empieza en lunes (o domingo)', () => {
    expect(startOfWeek('2026-11-12')).toBe('2026-11-09') // jueves
    expect(startOfWeek('2026-11-15')).toBe('2026-11-09') // domingo
    expect(startOfWeek('2026-11-12', 7)).toBe('2026-11-08')
    expect(weekOf('2026-11-12')).toHaveLength(7)
  })
  it('mes: filas completas de lunes a domingo', () => {
    const g = monthGrid('2026-11-12') // noviembre 2026 empieza en domingo
    expect(g).toHaveLength(6)
    expect(g[0]![0]).toBe('2026-10-26')
    expect(g[0]![6]).toBe('2026-11-01')
    expect(g.at(-1)![6]).toBe('2026-12-06')
    expect(g.every((r) => r.length === 7)).toBe(true)
    expect(monthGrid('2026-02-10')).toHaveLength(5)
  })
  it('febrero que empieza en lunes ocupa 4 filas', () => {
    expect(monthGrid('2027-02-10')).toHaveLength(4) // 1 feb 2027 = lunes, 28 días
  })
  it('meses', () => {
    expect(endOfMonth('2028-02-10')).toBe('2028-02-29')
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2026-01-15', -2)).toBe('2025-11-15')
    expect(shiftAnchor('week', '2026-11-12', 1)).toBe('2026-11-19')
    expect(shiftAnchor('day', '2026-11-12', -1)).toBe('2026-11-11')
    expect(shiftAnchor('month', '2026-12-12', 1)).toBe('2027-01-12')
  })
  it('rango visible', () => {
    expect(viewRange('day', '2026-11-12')).toEqual({ from: '2026-11-12', to: '2026-11-12' })
    expect(viewRange('week', '2026-11-12')).toEqual({ from: '2026-11-09', to: '2026-11-15' })
    expect(viewRange('month', '2026-11-12')).toEqual({ from: '2026-10-26', to: '2026-12-06' })
  })
  it('límites del día en Madrid (con cambio de hora)', () => {
    expect(dayBoundsMs('2026-11-12').map((x) => new Date(x).toISOString())).toEqual(['2026-11-11T23:00:00.000Z', '2026-11-12T23:00:00.000Z'])
    const [a, b] = dayBoundsMs('2026-10-25') // día de 25 h
    expect((b - a) / 3_600_000).toBe(25)
  })
})

const row = (over: Partial<EventRowLike>): EventRowLike => ({
  id: 'e1',
  calendar_id: 'c1',
  title: 'Clase',
  starts_at: '2026-11-12T17:00:00.000Z',
  ends_at: '2026-11-12T18:00:00.000Z',
  all_day: false,
  location: null,
  rrule: null,
  exdates: null,
  ...over,
})

describe('eventos por día', () => {
  const color = (id: string) => (id === 'c1' ? '#FF0000' : undefined)
  it('evento con hora en su día de Madrid', () => {
    const list = buildEvents([row({})], color, '2026-11-09', '2026-11-15')
    expect(list).toHaveLength(1)
    expect(list[0]!.color).toBe('#FF0000')
    expect(eventsOnDay(list, '2026-11-12')).toHaveLength(1)
    expect(eventsOnDay(list, '2026-11-13')).toHaveLength(0)
  })
  it('un evento a las 23:30 de Madrid cuenta para ese día, no para el siguiente en UTC', () => {
    const list = buildEvents([row({ starts_at: '2026-11-12T22:30:00.000Z', ends_at: '2026-11-12T22:45:00.000Z' })], color, '2026-11-09', '2026-11-15')
    expect(occursOn(list[0]!, '2026-11-12')).toBe(true)
    expect(occursOn(list[0]!, '2026-11-13')).toBe(false)
  })
  it('evento de varios días de todo el día (DTEND exclusivo)', () => {
    const list = buildEvents(
      [row({ all_day: true, starts_at: '2026-11-10T00:00:00.000Z', ends_at: '2026-11-13T00:00:00.000Z' })],
      color,
      '2026-11-09',
      '2026-11-15',
    )
    const days = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']
    expect([...groupByDay(list, days)].map(([, v]) => v.length)).toEqual([0, 1, 1, 1, 0])
  })
  it('recurrentes se expanden en el rango y los de todo el día van primero', () => {
    const list = buildEvents(
      [
        row({ id: 'r', rrule: 'FREQ=DAILY', ends_at: '2026-11-12T17:30:00.000Z' }),
        row({ id: 'a', all_day: true, starts_at: '2026-11-13T00:00:00.000Z', ends_at: '2026-11-14T00:00:00.000Z', title: 'Fiesta' }),
      ],
      color,
      '2026-11-12',
      '2026-11-14',
    )
    expect(eventsOnDay(list, '2026-11-13').map((e) => e.title)).toEqual(['Fiesta', 'Clase'])
    expect(list.filter((e) => e.id === 'r')).toHaveLength(3)
  })
  it('entregas como eventos de todo el día en su día de Madrid', () => {
    const [d] = deadlineEvents(
      [{ id: 'd1', title: 'Práctica 2', due_at: '2026-11-20T22:59:00.000Z', kind: 'assignment', done: false, subject_id: null }],
      () => '#00FF00',
    )
    expect(d!.allDay).toBe(true)
    expect(d!.title).toBe('Entrega: Práctica 2')
    expect(occursOn(d!, '2026-11-20')).toBe(true) // 23:59 Madrid
    expect(occursOn(d!, '2026-11-21')).toBe(false)
  })
})
