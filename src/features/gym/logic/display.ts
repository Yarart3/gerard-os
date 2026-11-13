import { formatDuration, formatNumber } from '../../../lib/format'
import { toDisplayWeight, type WeightUnit } from './sets'
import type { ExerciseUnit, SetValues } from './types'

export const formatWeight = (kg: number, unit: WeightUnit) =>
  `${formatNumber(toDisplayWeight(kg, unit), 1)} ${unit}`

/** Valor principal según la unidad: "102,5 kg", "12 repes", "1:30", "400 m", "15 cal". */
export function formatMetric(unit: ExerciseUnit, value: number, wu: WeightUnit = 'kg'): string {
  switch (unit) {
    case 'kg':
      return formatWeight(value, wu)
    case 'reps':
      return `${formatNumber(value, 0)} repes`
    case 'time':
      return formatDuration(value)
    case 'meters':
      return `${formatNumber(value, 0)} m`
    case 'calories':
      return `${formatNumber(value, 0)} cal`
  }
}

/** Lastre: "PC", "PC + 10 kg", "PC − 15 kg" (asistida). */
const formatAdded = (added: number, wu: WeightUnit) =>
  added === 0 ? 'PC' : `PC ${added > 0 ? '+' : '−'} ${formatWeight(Math.abs(added), wu)}`

/** Texto de una serie: "60 kg × 8", "PC + 10 kg × 8", "12 repes", "1:30"… */
export function formatSet(unit: ExerciseUnit, s: SetValues, wu: WeightUnit = 'kg'): string {
  if (s.added_kg != null && (unit === 'kg' || unit === 'reps')) {
    const w = formatAdded(s.added_kg, wu)
    return s.reps !== null ? `${w} × ${s.reps}` : w
  }
  if (unit === 'kg') {
    const w = s.weight_kg !== null ? formatWeight(s.weight_kg, wu) : '—'
    return s.reps !== null ? `${w} × ${s.reps}` : w
  }
  const map: Record<Exclude<ExerciseUnit, 'kg'>, number | null> = {
    reps: s.reps,
    time: s.seconds,
    meters: s.meters,
    calories: s.calories,
  }
  const v = map[unit]
  return v === null ? '—' : formatMetric(unit, v, wu)
}

/** Volumen compacto: "12.340 kg". */
export const formatVolume = (kg: number, wu: WeightUnit = 'kg') =>
  `${formatNumber(Math.round(toDisplayWeight(kg, wu)), 0)} ${wu}`

/** Cabeceras de las columnas de series según la unidad. */
export const SET_HEADERS: Record<ExerciseUnit, string[]> = {
  kg: ['Peso', 'Repes'],
  reps: ['Repes'],
  time: ['Tiempo'],
  meters: ['Metros'],
  calories: ['Calorías'],
}
