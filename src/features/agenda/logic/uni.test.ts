import { describe, expect, it } from 'vitest'
import { countdown, daysUntil, tfgProgress, weightedAverage } from './uni'
import { eventToForm, formToPayload, newEventForm } from './eventForm'

describe('media ponderada', () => {
  it('pondera por ECTS e ignora asignaturas sin nota o sin créditos', () => {
    const r = weightedAverage([
      { grade: 8, ects: 6 },
      { grade: 6, ects: 3 },
      { grade: null, ects: 6 },
      { grade: 10, ects: null },
    ])
    expect(r.average).toBeCloseTo((8 * 6 + 6 * 3) / 9, 10)
    expect(r.gradedEcts).toBe(9)
    expect(r.totalEcts).toBe(15)
  })
  it('sin notas → null', () => {
    expect(weightedAverage([{ grade: null, ects: 6 }]).average).toBeNull()
    expect(weightedAverage([]).average).toBeNull()
  })
})

describe('cuenta atrás', () => {
  it('cuenta días naturales en Madrid', () => {
    expect(daysUntil('2026-11-20T22:59:00.000Z', '2026-11-12')).toBe(8)
    expect(daysUntil('2026-11-12T22:30:00.000Z', '2026-11-12')).toBe(0) // 23:30 Madrid
    expect(daysUntil('2026-11-10T10:00:00.000Z', '2026-11-12')).toBe(-2)
  })
  it('etiquetas y tonos', () => {
    const t = '2026-11-12'
    expect(countdown('2026-11-12T10:00:00.000Z', t)).toMatchObject({ label: 'Hoy', tone: 'orange' })
    expect(countdown('2026-11-13T10:00:00.000Z', t).label).toBe('Mañana')
    expect(countdown('2026-11-30T10:00:00.000Z', t)).toMatchObject({ label: 'En 18 días', tone: 'accent' })
    expect(countdown('2026-11-30T10:00:00.000Z', t, { alertDays: 20 }).tone).toBe('orange')
    expect(countdown('2026-11-10T10:00:00.000Z', t)).toMatchObject({ label: 'Hace 2 días', tone: 'default' })
    expect(countdown('2026-11-30T10:00:00.000Z', t, { done: true })).toMatchObject({ label: 'Hecha', tone: 'green' })
  })
  it('progreso del TFG', () => {
    expect(tfgProgress([])).toBe(0)
    expect(tfgProgress([{ progress: 100 }, { progress: 50 }])).toBeCloseTo(0.75)
  })
})

describe('formulario de evento', () => {
  it('hora de Madrid ↔ UTC, ida y vuelta', () => {
    const f = { ...newEventForm('2026-07-15', 10), title: ' Dentista ' }
    const r = formToPayload(f)
    if ('error' in r) throw new Error(r.error)
    expect(r.payload.title).toBe('Dentista')
    expect(r.payload.starts_at).toBe('2026-07-15T08:00:00.000Z')
    expect(r.payload.ends_at).toBe('2026-07-15T09:00:00.000Z')
    expect(eventToForm(r.payload)).toMatchObject({ startDate: '2026-07-15', startTime: '10:00', endTime: '11:00' })
  })
  it('todo el día: final inclusive en el formulario, exclusivo al guardar', () => {
    const r = formToPayload({ ...newEventForm('2026-12-24'), title: 'Viaje', allDay: true, endDate: '2026-12-26' })
    if ('error' in r) throw new Error(r.error)
    expect(r.payload.starts_at).toBe('2026-12-24T00:00:00.000Z')
    expect(r.payload.ends_at).toBe('2026-12-27T00:00:00.000Z')
    expect(eventToForm(r.payload)).toMatchObject({ allDay: true, startDate: '2026-12-24', endDate: '2026-12-26' })
  })
  it('valida', () => {
    expect(formToPayload(newEventForm('2026-07-15'))).toEqual({ error: 'Escribe un título' })
    expect(formToPayload({ ...newEventForm('2026-07-15'), title: 'x', endTime: '09:00' })).toEqual({
      error: 'El final no puede ser anterior al inicio',
    })
  })
})
