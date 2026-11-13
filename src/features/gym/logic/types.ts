// Códigos en inglés en la base de datos; la interfaz los traduce (CLAUDE.md §9).
export const EXERCISE_TYPES = ['strength', 'gymnastics', 'metcon', 'cardio'] as const
export type ExerciseType = (typeof EXERCISE_TYPES)[number]

export const EXERCISE_UNITS = ['kg', 'reps', 'time', 'meters', 'calories'] as const
export type ExerciseUnit = (typeof EXERCISE_UNITS)[number]

export const TYPE_LABEL: Record<ExerciseType, string> = {
  strength: 'Fuerza',
  gymnastics: 'Gimnástico',
  metcon: 'Metcon',
  cardio: 'Cardio',
}

export const UNIT_LABEL: Record<ExerciseUnit, string> = {
  kg: 'Peso y repes',
  reps: 'Repeticiones',
  time: 'Tiempo',
  meters: 'Metros',
  calories: 'Calorías',
}

export const isExerciseType = (v: string): v is ExerciseType =>
  (EXERCISE_TYPES as readonly string[]).includes(v)
export const isExerciseUnit = (v: string): v is ExerciseUnit =>
  (EXERCISE_UNITS as readonly string[]).includes(v)

/** Valores de una serie (subconjunto de la fila `sets`). */
export type SetValues = {
  weight_kg: number | null
  /** Lastre en ejercicios de peso corporal (null en el resto). */
  added_kg?: number | null
  reps: number | null
  seconds: number | null
  meters: number | null
  calories: number | null
}
