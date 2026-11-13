import { useState, type FormEvent } from 'react'
import { NumberInput, Sheet, useToast } from '../../../components/ui'
import { formatKcal, formatNumber } from '../../../lib/format'
import { useUpdateWorkout, type Exercise, type Workout } from '../api'
import { useBodyWeight, useGymSettings } from '../gymSettings'
import { formatVolume } from '../logic/display'
import { exerciseMet, metKcal, sessionMet } from '../logic/met'
import { elapsedMinutes, sessionStats } from '../logic/session'
import s from '../Gym.module.css'

type Props = {
  workout: Workout | null
  exercises: ReadonlyMap<string, Exercise>
  onClose: () => void
  onSaved: () => void
}

/** «Terminar entreno»: repasa título, duración, kcal y notas y lo guarda (deja de estar en curso). */
export function FinishSheet({ workout, ...rest }: Props) {
  if (!workout) return null
  return (
    <Sheet open onClose={rest.onClose} title="Guardar entreno">
      <FinishForm key={workout.id} workout={workout} {...rest} />
    </Sheet>
  )
}

function FinishForm({ workout, exercises, onSaved }: Props & { workout: Workout }) {
  const { value: cfg } = useGymSettings()
  const weight = useBodyWeight()
  const update = useUpdateWorkout()
  const toast = useToast()
  const [title, setTitle] = useState(workout.title ?? '')
  const [minutes, setMinutes] = useState<number | null>(
    workout.duration_min ?? elapsedMinutes(workout.started_at),
  )
  const [watch, setWatch] = useState<number | null>(workout.watch_kcal)
  const [notes, setNotes] = useState(workout.notes ?? '')

  const stats = sessionStats(workout.workout_items)
  const met = sessionMet(
    workout.workout_items.flatMap((it) => {
      const e = exercises.get(it.exercise_id)
      return e ? [exerciseMet(e, cfg.met)] : []
    }),
    cfg.met.strength,
  )
  const estimate = weight && minutes ? Math.round(metKcal(met, weight, minutes) * 10) / 10 : null
  const pending = stats.total - stats.done

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!stats.done && !confirm('No has marcado ninguna serie como hecha. ¿Guardar igualmente?')) return
    update.mutate({
      id: workout.id,
      patch: {
        title: title.trim() || null,
        duration_min: minutes === null ? null : Math.max(0, Math.round(minutes)),
        watch_kcal: watch,
        met_kcal: estimate,
        notes: notes.trim() || null,
        finished_at: new Date().toISOString(),
      },
    })
    toast('Entreno guardado')
    onSaved()
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <label className={`field ${s.full}`}>
        <span className="field-label">Título</span>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <div className={`${s.summary} ${s.full}`} style={{ margin: 0 }}>
        <div className={s.stat}>
          <span className={s.statValue}>
            {stats.done}
            <span className={s.small}>/{stats.total}</span>
          </span>
          <span className={s.statLabel}>Series hechas</span>
        </div>
        <div className={s.stat}>
          <span className={s.statValue}>{stats.volume ? formatVolume(stats.volume, cfg.weight_unit) : '—'}</span>
          <span className={s.statLabel}>Volumen</span>
        </div>
        <div className={s.stat}>
          <span className={s.statValue}>{estimate !== null ? formatKcal(estimate) : '—'}</span>
          <span className={s.statLabel}>Kcal MET ({formatNumber(met, 1)})</span>
        </div>
      </div>
      <label className="field">
        <span className="field-label">Duración (min)</span>
        <NumberInput decimals={0} placeholder="0" value={minutes} onCommit={setMinutes} />
      </label>
      <label className="field">
        <span className="field-label">Apple Watch (kcal)</span>
        <NumberInput decimals={0} placeholder="0" value={watch} onCommit={setWatch} />
      </label>
      <label className={`field ${s.full}`}>
        <span className="field-label">Notas</span>
        <textarea
          className={s.textarea}
          style={{ minHeight: 88 }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Sensaciones, WOD, marcas…"
        />
      </label>
      {pending > 0 && (
        <p className={`${s.muted} ${s.full}`}>
          {pending === 1 ? 'Hay 1 serie sin marcar' : `Hay ${pending} series sin marcar`}: se guardan, pero no
          cuentan para el volumen ni los récords.
        </p>
      )}
      {!weight && <p className={`${s.muted} ${s.full}`}>Añade tu peso en Ajustes para estimar las calorías.</p>}
      <div className={s.full}>
        <button className="btn btn-primary">Guardar entreno</button>
      </div>
    </form>
  )
}
