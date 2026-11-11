import { useEffect } from 'react'
import { Card, NumberInput } from '../../../components/ui'
import { formatKcal, formatNumber } from '../../../lib/format'
import type { TablesUpdate } from '../../../lib/database.types'
import type { Exercise, Workout } from '../api'
import { useBodyWeight, useGymSettings } from '../gymSettings'
import { exerciseMet, metKcal, sessionMet } from '../logic/met'
import s from '../Gym.module.css'

type Props = {
  workout: Workout
  exercises: ReadonlyMap<string, Exercise>
  onUpdate: (patch: TablesUpdate<'workouts'>) => void
}

/** Estimación MET junto al dato manual del Apple Watch, con la diferencia. */
export function CaloriesCard({ workout, exercises, onUpdate }: Props) {
  const { value: cfg } = useGymSettings()
  const weight = useBodyWeight()
  const mets = workout.workout_items.flatMap((it) => {
    const e = exercises.get(it.exercise_id)
    return e ? [exerciseMet(e, cfg.met)] : []
  })
  const met = sessionMet(mets, cfg.met.strength)
  const minutes = workout.duration_min
  const estimate = weight && minutes ? Math.round(metKcal(met, weight, minutes) * 10) / 10 : null
  const watch = workout.watch_kcal

  // Guarda la estimación en la sesión para el historial y los resúmenes.
  const stored = workout.met_kcal
  useEffect(() => {
    if (estimate !== stored) onUpdate({ met_kcal: estimate })
  }, [estimate, stored, onUpdate])

  const diff = estimate !== null && watch !== null ? watch - estimate : null

  return (
    <Card title="Calorías">
      <div className={s.kcalGrid}>
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
            value={watch}
            onCommit={(v) => onUpdate({ watch_kcal: v })}
          />
        </label>
        <div className={s.stat}>
          <span className={s.statValue}>{estimate !== null ? formatKcal(estimate) : '—'}</span>
          <span className={s.statLabel}>Estimación MET ({formatNumber(met, 1)})</span>
        </div>
        <div className={s.stat}>
          <span className={s.statValue}>{watch !== null ? formatKcal(watch) : '—'}</span>
          <span className={s.statLabel}>Apple Watch</span>
        </div>
        <p className={s.diff}>
          {!weight
            ? 'Añade tu peso en Ajustes de Gym para estimar las calorías.'
            : !minutes
              ? 'Añade la duración para estimar las calorías.'
              : diff !== null
                ? `Diferencia: ${diff > 0 ? '+' : diff < 0 ? '−' : ''}${formatKcal(Math.abs(diff))} (reloj − estimación)`
                : 'Apunta las kcal del Apple Watch para compararlas.'}
        </p>
      </div>
    </Card>
  )
}
