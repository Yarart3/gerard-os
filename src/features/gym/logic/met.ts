import type { ExerciseType } from './types'

/** MET por defecto según el tipo (CLAUDE.md §6, editables en Ajustes). */
export const DEFAULT_MET: Record<ExerciseType, number> = {
  strength: 5.0,
  gymnastics: 6.0,
  metcon: 8.0,
  cardio: 7.0,
}

/** kcal = MET × 3,5 × peso_kg / 200 × minutos */
export function metKcal(met: number, weightKg: number, minutes: number): number {
  if (met <= 0 || weightKg <= 0 || minutes <= 0) return 0
  return ((met * 3.5 * weightKg) / 200) * minutes
}

/** MET efectivo de un ejercicio: el suyo propio o el del tipo. */
export function exerciseMet(
  exercise: { met: number | null; type: string },
  metByType: Record<ExerciseType, number>,
): number {
  if (exercise.met !== null && exercise.met > 0) return exercise.met
  return metByType[exercise.type as ExerciseType] ?? metByType.strength
}

/** MET de la sesión: media de sus ejercicios (o el de fuerza si no hay ninguno). */
export function sessionMet(mets: number[], fallback: number): number {
  if (!mets.length) return fallback
  return mets.reduce((a, b) => a + b, 0) / mets.length
}
