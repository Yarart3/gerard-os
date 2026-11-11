import { fromDisplayWeight, nextSet, prefillSets, toDisplayWeight } from './sets'

const s = (weight_kg: number, reps: number) => ({
  weight_kg,
  reps,
  seconds: null,
  meters: null,
  calories: null,
})

describe('series', () => {
  it('rellena con los últimos valores usados', () => {
    expect(prefillSets([s(60, 8), s(65, 6)])).toEqual([s(60, 8), s(65, 6)])
    expect(prefillSets([])).toHaveLength(1)
  })
  it('una serie nueva repite la anterior', () => {
    expect(nextSet([s(60, 8), s(70, 5)])).toEqual(s(70, 5))
  })
  it('convierte kg ↔ lb', () => {
    expect(toDisplayWeight(100, 'lb')).toBeCloseTo(220.46, 1)
    expect(fromDisplayWeight(toDisplayWeight(80, 'lb'), 'lb')).toBeCloseTo(80)
  })
})
