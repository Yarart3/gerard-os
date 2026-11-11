import type { SetValues } from './types'

export const EMPTY_SET: SetValues = {
  weight_kg: null,
  reps: null,
  seconds: null,
  meters: null,
  calories: null,
}

const pick = (s: SetValues): SetValues => ({
  weight_kg: s.weight_kg,
  reps: s.reps,
  seconds: s.seconds,
  meters: s.meters,
  calories: s.calories,
})

/** Series iniciales al añadir un ejercicio: copia las de la última vez (sin marcar), o una vacía. */
export function prefillSets(lastSets: readonly SetValues[]): SetValues[] {
  return lastSets.length ? lastSets.map(pick) : [{ ...EMPTY_SET }]
}

/** Nueva serie: repite los valores de la última serie del ejercicio. */
export const nextSet = (sets: readonly SetValues[]): SetValues => {
  const last = sets[sets.length - 1]
  return last ? pick(last) : { ...EMPTY_SET }
}

// Unidades de peso: en la base de datos siempre kg.
export type WeightUnit = 'kg' | 'lb'
const LB = 0.45359237
export const toDisplayWeight = (kg: number, unit: WeightUnit) => (unit === 'kg' ? kg : kg / LB)
export const fromDisplayWeight = (v: number, unit: WeightUnit) => (unit === 'kg' ? v : v * LB)
