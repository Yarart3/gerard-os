import { useCallback, useMemo, useState } from 'react'
import { Card, EmptyState, useToast } from '../../../components/ui'
import { Clipboard, Dumbbell, Plus, Repeat } from '../../../components/ui/icons'
import { formatLongDate, formatShortDate, todayISO } from '../../../lib/dates'
import type { TablesUpdate } from '../../../lib/database.types'
import {
  lastSetsOf,
  useAddItems,
  useExercises,
  useSwapItems,
  useUpdateWorkout,
  useWorkoutHistory,
  useWorkoutOn,
  type Exercise,
} from '../api'
import { ExercisePicker } from '../catalog/ExercisePicker'
import { useGymSettings } from '../gymSettings'
import { prefillSets } from '../logic/sets'
import { CaloriesCard } from './CaloriesCard'
import { ExerciseCard } from './ExerciseCard'
import { RestTimer } from './RestTimer'
import { WodSheet } from './WodSheet'
import s from '../Gym.module.css'

export function WorkoutTab() {
  const date = todayISO()
  const toast = useToast()
  const { value: cfg } = useGymSettings()
  const workoutQ = useWorkoutOn(date)
  const { data: history = [] } = useWorkoutHistory()
  const { data: catalog = [] } = useExercises()
  const workout = workoutQ.data
  const addItems = useAddItems(date, workout)
  const update = useUpdateWorkout()
  const swap = useSwapItems()
  const [picker, setPicker] = useState(false)
  const [wod, setWod] = useState(false)
  const [restEnd, setRestEnd] = useState<number | null>(null)

  const exercises = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog])
  const previous = history.find((w) => w.date < date && w.items.length)
  const items = workout?.workout_items ?? []

  const add = async (list: Exercise[], notes?: string) => {
    await addItems.mutateAsync({
      items: list.map((e) => ({ exercise_id: e.id, sets: prefillSets(lastSetsOf(history, e.id, date)) })),
      notes,
    })
  }

  const repeat = async () => {
    if (!previous) return
    try {
      await addItems.mutateAsync({
        items: previous.items.map((it) => ({
          exercise_id: it.exercise_id,
          sets: prefillSets(it.sets),
        })),
      })
      toast(`Sesión del ${formatShortDate(previous.date)} copiada`)
    } catch {
      toast('No se ha podido copiar', 'error')
    }
  }

  const workoutId = workout?.id
  const onUpdate = useCallback(
    (patch: TablesUpdate<'workouts'>) => {
      if (workoutId) update.mutate({ id: workoutId, patch })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `update.mutate` es estable
    [workoutId],
  )
  const stopRest = useCallback(() => setRestEnd(null), [])

  if (workoutQ.isLoading) return <p className={s.muted}>Cargando…</p>
  if (workoutQ.error) return <p className={s.muted}>No se ha podido cargar la sesión.</p>

  const actions = (
    <div className={s.actions}>
      <button type="button" className={`btn ${s.accentBtn}`} onClick={() => setPicker(true)}>
        <Plus size={20} /> Añadir ejercicio
      </button>
      <button type="button" className={`btn ${s.accentBtn}`} onClick={() => setWod(true)}>
        <Clipboard size={20} /> Pegar WOD
      </button>
      {previous && !items.length && (
        <button type="button" className={`btn ${s.accentBtn}`} onClick={repeat} disabled={addItems.isPending}>
          <Repeat size={20} /> Repetir sesión anterior
        </button>
      )}
    </div>
  )

  return (
    <div className={s.stack}>
      {!items.length ? (
        <Card>
          <EmptyState
            icon={<Dumbbell size={40} />}
            title="Sin entreno hoy"
            text={
              previous
                ? `Última sesión: ${formatLongDate(previous.date)}. Añade ejercicios en el orden en que los hagas.`
                : 'Añade ejercicios en el orden en que los hagas. Cada serie se rellena con lo último que usaste.'
            }
          />
          {actions}
        </Card>
      ) : (
        <>
          {items.map((item, i) => (
            <ExerciseCard
              key={item.id}
              date={date}
              item={item}
              exercise={exercises.get(item.exercise_id)}
              canUp={i > 0}
              canDown={i < items.length - 1}
              onMove={(dir) => {
                const other = items[i + dir]
                if (other) swap.mutate([item, other])
              }}
              onSetDone={() => setRestEnd(Date.now() + cfg.rest_seconds * 1000)}
            />
          ))}
          <Card>{actions}</Card>
        </>
      )}
      {workout && (
        <>
          <CaloriesCard workout={workout} exercises={exercises} onUpdate={onUpdate} />
          <Card title="Notas">
            <textarea
              key={`${workout.id}:${workout.notes ?? ''}`}
              className={s.textarea}
              style={{ minHeight: 88 }}
              aria-label="Notas de la sesión"
              defaultValue={workout.notes ?? ''}
              placeholder="Sensaciones, WOD, marcas…"
              onBlur={(e) => {
                const v = e.target.value.trim() || null
                if (v !== workout.notes) onUpdate({ notes: v })
              }}
            />
          </Card>
        </>
      )}
      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(e) => {
          setPicker(false)
          add([e]).catch(() => toast('No se ha podido añadir', 'error'))
        }}
      />
      <WodSheet
        open={wod}
        onClose={() => setWod(false)}
        onAdd={(list, text) => add(list, [workout?.notes, text].filter(Boolean).join('\n\n'))}
      />
      {restEnd !== null && <RestTimer key={restEnd} endsAt={restEnd} onDone={stopRest} />}
    </div>
  )
}
