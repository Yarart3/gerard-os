import { useEffect } from 'react'
import { Card, NumberInput } from '../../../components/ui'
import type { TablesUpdate } from '../../../lib/database.types'
import type { Exercise, Workout } from '../api'
import { energyJson, parseEnergy, type Energy } from '../energy'
import { useBodyWeight, useGymSettings } from '../gymSettings'
import { exerciseMet, metKcal, sessionMet } from '../logic/met'
import { EnergyPanel } from './EnergyPanel'
import { useEnergyMethods } from './useEnergyMethods'
import s from '../Gym.module.css'

type Props = {
  workout: Workout
  exercises: ReadonlyMap<string, Exercise>
  onUpdate: (patch: TablesUpdate<'workouts'>) => void
}

/** Duración y kcal del Apple Watch, con las estimaciones por fórmulas y por IA (al editar un entreno). */
export function CaloriesCard({ workout, exercises, onUpdate }: Props) {
  const { value: cfg } = useGymSettings()
  const weight = useBodyWeight()
  const minutes = workout.duration_min
  const energy = parseEnergy(workout.energy)
  const { combined } = useEnergyMethods(workout, exercises, minutes, energy.avg_hr ?? null)
  const met = sessionMet(
    workout.workout_items.flatMap((it) => {
      const e = exercises.get(it.exercise_id)
      return e ? [exerciseMet(e, cfg.met)] : []
    }),
    cfg.met.strength,
  )
  const estimate = weight && minutes ? Math.round(metKcal(met, weight, minutes) * 10) / 10 : null

  // Guarda la estimación MET y la combinada para el historial y los resúmenes.
  const storedMet = workout.met_kcal
  const storedCombined = energy.combined ?? null
  useEffect(() => {
    if (estimate !== storedMet) onUpdate({ met_kcal: estimate })
  }, [estimate, storedMet, onUpdate])
  const energyRaw = JSON.stringify(workout.energy ?? null)
  useEffect(() => {
    if (combined !== storedCombined)
      onUpdate({ energy: energyJson({ ...(JSON.parse(energyRaw) as Energy | null), combined }) })
  }, [combined, storedCombined, energyRaw, onUpdate])

  return (
    <Card title="Calorías">
      <div className={s.kcalGrid} style={{ marginBottom: 12 }}>
        <label className="field">
          <span className="field-label">Duración (min)</span>
          <NumberInput
            decimals={0}
            placeholder="0"
            value={minutes}
            onCommit={(v) => onUpdate({ duration_min: v === null ? null : Math.max(0, Math.round(v)) })}
          />
        </label>
        <label className="field">
          <span className="field-label">Apple Watch (kcal)</span>
          <NumberInput
            decimals={0}
            placeholder="0"
            value={workout.watch_kcal}
            onCommit={(v) => onUpdate({ watch_kcal: v })}
          />
        </label>
      </div>
      <EnergyPanel
        workout={workout}
        exercises={exercises}
        minutes={minutes}
        watch={workout.watch_kcal}
        energy={energy}
        onEnergy={(e) => onUpdate({ energy: energyJson({ ...e, combined }) })}
      />
    </Card>
  )
}
