import type { Exercise, Workout } from '../api'
import { useBody, useGymSettings } from '../gymSettings'
import { combinedKcal, energyMethods, type EnergyItem } from '../logic/calories'
import { exerciseMet } from '../logic/met'
import type { ExerciseType } from '../logic/types'

/** Las estimaciones de kcal con varias fórmulas, su mediana, la de la IA y la comparación con el Watch. */
export function useEnergyMethods(workout: Workout, exercises: ReadonlyMap<string, Exercise>, minutes: number | null, avgHr: number | null) {
  const { value: cfg } = useGymSettings()
  const body = useBody()
  const items: EnergyItem[] = workout.workout_items.flatMap((it) => {
      const e = exercises.get(it.exercise_id)
      return e ? [{ type: e.type as ExerciseType, met: exerciseMet(e, cfg.met), unit: e.unit, sets: it.sets }] : []
    })
  const methods = energyMethods({ items, minutes, avgHr, body })
  return { methods, combined: combinedKcal(methods), body }
}

