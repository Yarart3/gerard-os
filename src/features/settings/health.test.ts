import { describe, expect, it } from 'vitest'
import {
  aggregateByDay,
  madridDay,
  parseHealthBody,
  parseInstant,
  parseNumber,
  planHealth,
  type ExistingWorkout,
} from '../../../supabase/functions/_shared/health'

describe('parseNumber', () => {
  it('acepta números, comas decimales y unidades', () => {
    expect(parseNumber(312)).toBe(312)
    expect(parseNumber('312,5')).toBe(312.5)
    expect(parseNumber(' 312.5 kcal')).toBe(312.5)
    expect(parseNumber('abc')).toBeNull()
    expect(parseNumber(null)).toBeNull()
    expect(parseNumber(NaN)).toBeNull()
  })
})

describe('parseInstant', () => {
  it('lee ISO con zona (Z, +01:00, +0100, espacio en vez de T)', () => {
    const t = Date.UTC(2026, 10, 12, 17, 30, 0)
    expect(parseInstant('2026-11-12T17:30:00Z')).toBe(t)
    expect(parseInstant('2026-11-12T18:30:00+01:00')).toBe(t)
    expect(parseInstant('2026-11-12 18:30:00 +0100')).toBe(t)
    expect(parseInstant('2026-11-12T18:30:00.123+01')).toBe(t)
  })
  it('sin zona usa la hora de Madrid (invierno y verano)', () => {
    expect(parseInstant('2026-11-12T18:30:00')).toBe(Date.UTC(2026, 10, 12, 17, 30))
    expect(parseInstant('2026-07-12T18:30:00')).toBe(Date.UTC(2026, 6, 12, 16, 30))
  })
  it('rechaza basura', () => {
    expect(parseInstant('ayer')).toBeNull()
    expect(parseInstant('2026-13-40T10:00:00Z')).toBeNull()
    expect(parseInstant(5)).toBeNull()
  })
})

describe('madridDay', () => {
  it('cuenta el día en Europe/Madrid, no en UTC', () => {
    expect(madridDay(Date.UTC(2026, 10, 12, 23, 30))).toBe('2026-11-13') // 00:30 en Madrid
    expect(madridDay(Date.UTC(2026, 10, 12, 22, 30))).toBe('2026-11-12')
    expect(madridDay(Date.UTC(2026, 6, 12, 22, 30))).toBe('2026-07-13') // verano: UTC+2
  })
})

describe('parseHealthBody: forma plana del Atajo (energía activa)', () => {
  it('sin start usa el momento de la petición y tipo "Energía activa"', () => {
    const now = Date.parse('2026-11-13T19:30:00Z')
    const p = parseHealthBody({ active_kcal: '412,6 kcal' }, now)
    expect(p.workouts).toEqual([{ start: now, end: null, durationMin: null, type: 'Energía activa', activeKcal: 412.6 }])
    expect(p.skipped).toBe(0)
  })
  it('acepta duración y tipo si vienen', () => {
    const p = parseHealthBody({ active_kcal: 300, duration_min: '55', type: 'CrossFit' }, 0)
    expect(p.workouts[0]).toMatchObject({ durationMin: 55, type: 'CrossFit', activeKcal: 300 })
  })
})

describe('parseHealthBody', () => {
  it('tolera kcal en texto con coma, un único entreno suelto y duración desde end', () => {
    const p = parseHealthBody({
      workouts: {
        start: '2026-11-12T18:00:00+01:00',
        end: '2026-11-12T18:45:00+01:00',
        type: ' Running ',
        active_kcal: '312,5',
      },
    })
    expect(p.workouts).toHaveLength(1)
    expect(p.workouts[0]).toMatchObject({ durationMin: 45, type: 'Running', activeKcal: 312.5 })
  })
  it('cuenta como omitidas las entradas sin fecha o sin kcal; sin workouts es válido', () => {
    const p = parseHealthBody({
      workouts: [
        { start: 'x', active_kcal: 1 },
        { start: '2026-11-12T10:00:00Z' },
        7,
        { start: '2026-11-12T10:00:00Z', active_kcal: 5 },
      ],
    })
    expect(p.workouts).toHaveLength(1)
    expect(p.skipped).toBe(3)
    expect(parseHealthBody({}).workouts).toEqual([])
  })
  it('lee active_kcal_day y rechaza cuerpos que no son objetos', () => {
    expect(parseHealthBody({ active_kcal_day: { date: '2026-11-12', kcal: '540,2' } }).dayKcal).toEqual({
      date: '2026-11-12',
      kcal: 540.2,
    })
    expect(parseHealthBody({ active_kcal_day: { date: 'hoy', kcal: 1 } }).dayKcal).toBeNull()
    expect(() => parseHealthBody([])).toThrow()
    expect(() => parseHealthBody('x')).toThrow()
  })
})

const body = {
  workouts: [
    { start: '2026-11-12T08:00:00+01:00', duration_min: 30, type: 'Running', active_kcal: 300 },
    { start: '2026-11-12T19:00:00+01:00', duration_min: '45', type: 'Strength', active_kcal: '250,5' },
    { start: '2026-11-13T09:00:00+01:00', active_kcal: 100 },
  ],
}

describe('aggregateByDay / planHealth', () => {
  const parsed = parseHealthBody(body)
  const now = new Date('2026-11-13T20:00:00Z')

  it('agrupa por día de Madrid sumando kcal y minutos', () => {
    const days = aggregateByDay(parsed.workouts)
    expect(days.map((d) => [d.date, d.activeKcal, d.durationMin])).toEqual([
      ['2026-11-12', 550.5, 75],
      ['2026-11-13', 100, null],
    ])
    expect(days[0]!.types).toEqual(['Running', 'Strength'])
  })

  it('sin entreno ese día crea uno strength con notas y kcal', () => {
    const actions = planHealth(parsed, [], now)
    expect(actions).toHaveLength(2)
    expect(actions[0]).toMatchObject({
      op: 'create',
      row: {
        date: '2026-11-12',
        kind: 'strength',
        watch_kcal: 550.5,
        duration_min: 75,
        notes: 'Apple Watch: Running, Strength',
        started_at: '2026-11-12T07:00:00.000Z',
      },
    })
    expect(actions[1]).toMatchObject({ op: 'create', row: { notes: 'Apple Watch', duration_min: null } })
  })

  it('con entreno ese día actualiza watch_kcal y solo rellena la duración si está vacía', () => {
    const existing: ExistingWorkout[] = [
      { id: 'a', date: '2026-11-12', watch_kcal: null, duration_min: 60 },
      { id: 'b', date: '2026-11-13', watch_kcal: 80, duration_min: null },
    ]
    const [a, b] = planHealth(parsed, existing, now)
    expect(a).toMatchObject({ op: 'update', id: 'a', patch: { watch_kcal: 550.5 } })
    expect(a?.op === 'update' && 'duration_min' in a.patch).toBe(false)
    expect(b).toMatchObject({ op: 'update', id: 'b', patch: { watch_kcal: 100 } })
  })

  it('es idempotente: tras aplicar el plan, reenviar lo mismo solo actualiza (no crea)', () => {
    const first = planHealth(parsed, [], now)
    const stored: ExistingWorkout[] = first.map((a, i) => {
      if (a.op !== 'create') throw new Error('esperaba create')
      return {
        id: String(i),
        date: a.row.date,
        watch_kcal: a.row.watch_kcal,
        duration_min: a.row.duration_min,
      }
    })
    const second = planHealth(parsed, stored, now)
    expect(second.every((a) => a.op === 'update')).toBe(true)
    expect(second.map((a) => a.op === 'update' && a.patch.watch_kcal)).toEqual(
      first.map((a) => a.op === 'create' && a.row.watch_kcal),
    )
  })

  it('active_kcal_day solo rellena un watch_kcal vacío existente y nunca crea', () => {
    const p = parseHealthBody({ active_kcal_day: { date: '2026-11-12', kcal: 600 } })
    expect(planHealth(p, [], now)).toEqual([])
    expect(
      planHealth(p, [{ id: 'a', date: '2026-11-12', watch_kcal: 200, duration_min: null }], now),
    ).toEqual([])
    expect(
      planHealth(p, [{ id: 'a', date: '2026-11-12', watch_kcal: null, duration_min: null }], now),
    ).toHaveLength(1)
  })
})
