import { bodyweightTotal, looksBodyweight, usesBodyweight, withBodyweight } from './bodyweight'
import { formatSet } from './display'
import { prefillSets } from './sets'

const set = (added_kg: number | null, reps: number, weight_kg: number | null = null) => ({
  weight_kg,
  added_kg,
  reps,
  seconds: null,
  meters: null,
  calories: null,
})

describe('peso corporal', () => {
  it('detecta los ejercicios por nombre o alias', () => {
    expect(looksBodyweight('Dominadas')).toBe(true)
    expect(looksBodyweight('Pull-ups')).toBe(true)
    expect(looksBodyweight('Fondos en paralelas')).toBe(true)
    expect(looksBodyweight('Flexiones')).toBe(true)
    expect(looksBodyweight('Ring muscle-up')).toBe(true)
    expect(looksBodyweight('Jalón', ['Lat pulldown'])).toBe(false)
    expect(looksBodyweight('Press banca')).toBe(false)
    expect(looksBodyweight('Remo', ['Ring row'])).toBe(true)
  })
  it('lo elegido a mano manda sobre lo automático y solo aplica con peso o repes', () => {
    expect(usesBodyweight({ name: 'Dominadas', unit: 'reps', bodyweight: null })).toBe(true)
    expect(usesBodyweight({ name: 'Dominadas', unit: 'reps', bodyweight: false })).toBe(false)
    expect(usesBodyweight({ name: 'Lastre raro', unit: 'kg', bodyweight: true })).toBe(true)
    expect(usesBodyweight({ name: 'Dominadas', unit: 'time', bodyweight: true })).toBe(false)
  })
  it('carga total = peso corporal + lastre', () => {
    expect(bodyweightTotal(75, 10)).toBe(85)
    expect(bodyweightTotal(75, null)).toBe(75)
    expect(bodyweightTotal(75, -20)).toBe(55)
    expect(bodyweightTotal(null, 10)).toBeNull()
  })
  it('al copiar series usa el peso de hoy y conserva el lastre', () => {
    const [a, b] = prefillSets([set(10, 5, 82), set(null, 8)]).map((x) => withBodyweight(x, 76))
    expect(a).toMatchObject({ added_kg: 10, weight_kg: 86, reps: 5 })
    expect(b).toMatchObject({ added_kg: 0, weight_kg: 76, reps: 8 })
  })
  it('formatea las series', () => {
    expect(formatSet('kg', set(0, 8, 75))).toBe('PC × 8')
    expect(formatSet('reps', set(10, 5, 85))).toBe('PC + 10 kg × 5')
    expect(formatSet('kg', set(-15, 6, 60))).toBe('PC − 15 kg × 6')
  })
})
