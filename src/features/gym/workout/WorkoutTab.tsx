import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, EmptyState, ListRow, useToast } from '../../../components/ui'
import { Clipboard, Dumbbell, Plus, Repeat } from '../../../components/ui/icons'
import { formatShortDate } from '../../../lib/dates'
import type { TablesUpdate } from '../../../lib/database.types'
import { useToday } from '../../../lib/useToday'
import {
  lastSetsOf,
  useActiveWorkout,
  useAddItems,
  useDeleteWorkout,
  useExercises,
  useStartWorkout,
  useSwapItems,
  useUpdateWorkout,
  useWorkout,
  useWorkoutHistory,
  type Exercise,
  type HistoryWorkout,
  type Workout,
} from '../api'
import { ExercisePicker } from '../catalog/ExercisePicker'
import { useBodyWeight, useGymSettings } from '../gymSettings'
import { usesBodyweight, withBodyweight } from '../logic/bodyweight'
import { formatVolume } from '../logic/display'
import { defaultTitle, formatElapsed, sessionStats } from '../logic/session'
import { prefillSets } from '../logic/sets'
import type { SetValues } from '../logic/types'
import { CaloriesCard } from './CaloriesCard'
import { ExerciseCard } from './ExerciseCard'
import { FinishSheet } from './FinishSheet'
import { RestTimer } from './RestTimer'
import { WodSheet } from './WodSheet'
import s from '../Gym.module.css'

/**
 * Entreno al estilo Hevy:
 * - sin entreno en curso: «Empezar entreno», repetir el último y los entrenos de hoy (tocar = editar);
 * - en curso: cabecera fija con cronómetro, volumen y series, y «Terminar» → hoja «Guardar entreno»;
 * - editando uno terminado: los mismos ejercicios y series, más calorías y notas.
 */
export function WorkoutTab() {
  const today = useToday()
  const toast = useToast()
  const activeQ = useActiveWorkout()
  // El entreno que se edita va en la URL (#/gym?editar=<id>): así se abre también desde Historial
  // y el botón Atrás vuelve a donde estabas.
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const editingRaw = params.get('editar')
  const setEditingId = (id: string | null) => {
    if (id) setParams({ editar: id })
    else if ((window.history.state as { idx?: number } | null)?.idx) navigate(-1)
    else setParams({}, { replace: true })
  }
  const editQ = useWorkout(editingRaw)
  // Si el entreno que se editaba ya no existe (borrado), se vuelve a la vista inicial.
  const editingId = editingRaw && !(editQ.isSuccess && !editQ.data) ? editingRaw : null
  const { data: history = [] } = useWorkoutHistory()
  const { data: catalog = [] } = useExercises()
  const bodyKg = useBodyWeight()
  const start = useStartWorkout()
  const del = useDeleteWorkout()
  const [picker, setPicker] = useState(false)
  const [wod, setWod] = useState(false)
  const [finishing, setFinishing] = useState(false)

  const active = activeQ.data ?? null
  const editing = editingId ? (editQ.data ?? null) : null
  const workout = editingId ? editing : active
  const addItems = useAddItems(today, workout)
  const exercises = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog])
  const last = history.find((w) => w.finished_at && w.items.length && w.id !== workout?.id)
  const todayDone = history
    .filter((w) => w.date === today && w.finished_at)
    .sort((a, b) => (a.started_at ?? '').localeCompare(b.started_at ?? ''))

  // Copia las series de la última vez; en peso corporal, con el peso de hoy y el mismo lastre.
  const prefill = (exerciseId: string, sets: readonly SetValues[]) => {
    const list = prefillSets(sets)
    return usesBodyweight(exercises.get(exerciseId)) ? list.map((x) => withBodyweight(x, bodyKg)) : list
  }

  const add = async (list: Exercise[], notes?: string) => {
    await addItems.mutateAsync({
      items: list.map((e) => ({
        exercise_id: e.id,
        sets: prefill(e.id, lastSetsOf(history, e.id, workout?.id, editingId ? workout?.date : undefined)),
      })),
      notes,
      title: defaultTitle(),
    })
  }

  const repeat = async (from: HistoryWorkout) => {
    try {
      await addItems.mutateAsync({
        items: from.items.map((it) => ({ exercise_id: it.exercise_id, sets: prefill(it.exercise_id, it.sets) })),
        title: from.title ?? defaultTitle(),
      })
      toast(`«${from.title ?? 'Entreno'}» del ${formatShortDate(from.date)} copiado`)
    } catch {
      toast('No se ha podido copiar', 'error')
    }
  }

  if (activeQ.isLoading || (editingId && editQ.isLoading)) return <p className={s.muted}>Cargando…</p>
  if (activeQ.error) return <p className={s.muted}>No se ha podido cargar el entreno.</p>

  const sheets = (
    <>
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
    </>
  )

  // ---------- Sin entreno en curso ----------
  if (!workout) {
    return (
      <div className={s.stack}>
        <Card>
          <EmptyState
            icon={<Dumbbell size={40} />}
            title="Empezar entreno"
            text="Añade ejercicios en el orden en que los hagas. Cada serie se rellena con lo último que usaste."
          />
          <div className={s.stack} style={{ gap: 8 }}>
            <button
              type="button"
              className={s.startBtn}
              onClick={() => start.mutate({ date: today, title: defaultTitle() })}
            >
              <Plus size={20} /> Empezar entreno vacío
            </button>
            <div className={s.actions}>
              <button type="button" className={`btn ${s.accentBtn}`} onClick={() => setWod(true)}>
                <Clipboard size={20} /> Pegar WOD
              </button>
              {last && (
                <button
                  type="button"
                  className={`btn ${s.accentBtn}`}
                  onClick={() => repeat(last)}
                  disabled={addItems.isPending}
                >
                  <Repeat size={20} /> Repetir «{last.title ?? formatShortDate(last.date)}»
                </button>
              )}
            </div>
          </div>
        </Card>
        {todayDone.length > 0 && (
          <Card title="Hoy" flush>
            {todayDone.map((w) => (
              <DoneRow key={w.id} workout={w} onOpen={() => setEditingId(w.id)} />
            ))}
          </Card>
        )}
        {sheets}
      </div>
    )
  }

  // ---------- En curso o editando ----------
  const isLive = !editingId
  return (
    <WorkoutView
      key={workout.id}
      workout={workout}
      isLive={isLive}
      exercises={exercises}
      history={history}
      lastForRepeat={last}
      onRepeat={repeat}
      onAddExercise={() => setPicker(true)}
      onPasteWod={() => setWod(true)}
      onFinish={() => setFinishing(true)}
      onDone={() => setEditingId(null)}
      onDiscard={() => {
        const msg = isLive
          ? '¿Descartar este entreno? Se borrarán sus ejercicios y series.'
          : '¿Borrar este entreno y todas sus series?'
        if (!confirm(msg)) return
        del.mutate(workout.id)
        setEditingId(null)
        toast(isLive ? 'Entreno descartado' : 'Entreno borrado')
      }}
    >
      {sheets}
      {finishing && (
        <FinishSheet
          workout={workout}
          exercises={exercises}
          onClose={() => setFinishing(false)}
          onSaved={() => setFinishing(false)}
        />
      )}
    </WorkoutView>
  )
}

function DoneRow({ workout: w, onOpen }: { workout: HistoryWorkout; onOpen: () => void }) {
  const { value: cfg } = useGymSettings()
  const st = sessionStats(w.items)
  return (
    <ListRow
      title={w.title ?? 'Entreno'}
      subtitle={[
        `${w.items.length} ${w.items.length === 1 ? 'ejercicio' : 'ejercicios'}`,
        `${st.done} series`,
        st.volume ? formatVolume(st.volume, cfg.weight_unit) : null,
      ]
        .filter(Boolean)
        .join(' · ')}
      value={w.duration_min ? `${w.duration_min} min` : undefined}
      onClick={onOpen}
    />
  )
}

type ViewProps = {
  workout: Workout
  isLive: boolean
  exercises: ReadonlyMap<string, Exercise>
  history: readonly HistoryWorkout[]
  lastForRepeat: HistoryWorkout | undefined
  onRepeat: (w: HistoryWorkout) => void
  onAddExercise: () => void
  onPasteWod: () => void
  onFinish: () => void
  onDone: () => void
  onDiscard: () => void
  children: React.ReactNode
}

function WorkoutView({
  workout,
  isLive,
  exercises,
  history,
  lastForRepeat,
  onRepeat,
  onAddExercise,
  onPasteWod,
  onFinish,
  onDone,
  onDiscard,
  children,
}: ViewProps) {
  const { value: cfg } = useGymSettings()
  const update = useUpdateWorkout()
  const swap = useSwapItems()
  const [restEnd, setRestEnd] = useState<number | null>(null)
  const stopRest = useCallback(() => setRestEnd(null), [])
  const items = workout.workout_items
  const workoutId = workout.id
  const onUpdate = useCallback(
    (patch: TablesUpdate<'workouts'>) => update.mutate({ id: workoutId, patch }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `update.mutate` es estable
    [workoutId],
  )

  return (
    <div className={s.stack}>
      <div className={s.liveBar}>
        <div className={s.liveTop}>
          <input
            key={`${workout.id}:${workout.title ?? ''}`}
            className={s.titleInput}
            aria-label="Título del entreno"
            defaultValue={workout.title ?? ''}
            placeholder="Entreno"
            onBlur={(e) => {
              const v = e.target.value.trim() || null
              if (v !== workout.title) onUpdate({ title: v })
            }}
          />
          {isLive ? (
            <button type="button" className={s.finishBtn} onClick={onFinish}>
              Terminar
            </button>
          ) : (
            <button type="button" className={s.finishBtn} onClick={onDone}>
              Hecho
            </button>
          )}
        </div>
        {!isLive && (
          <label className={s.dateRow}>
            <span className={s.small}>Fecha</span>
            <input
              type="date"
              className="input"
              value={workout.date}
              onChange={(e) => e.target.value && onUpdate({ date: e.target.value })}
            />
          </label>
        )}
        <LiveStats workout={workout} isLive={isLive} />
      </div>

      {items.length === 0 && (
        <Card>
          <EmptyState
            icon={<Dumbbell size={40} />}
            title="Sin ejercicios"
            text="Añade el primero o copia tu último entreno."
          />
        </Card>
      )}
      {items.map((item, i) => (
        <ExerciseCard
          key={item.id}
          item={item}
          exercise={exercises.get(item.exercise_id)}
          previous={lastSetsOf(history, item.exercise_id, workout.id, isLive ? undefined : workout.date)}
          canUp={i > 0}
          canDown={i < items.length - 1}
          onMove={(dir) => {
            const other = items[i + dir]
            if (other) swap.mutate([item, other])
          }}
          onSetDone={() => {
            if (isLive) setRestEnd(Date.now() + cfg.rest_seconds * 1000)
          }}
        />
      ))}

      <Card>
        <div className={s.actions}>
          <button type="button" className={`btn ${s.accentBtn}`} onClick={onAddExercise}>
            <Plus size={20} /> Añadir ejercicio
          </button>
          <button type="button" className={`btn ${s.accentBtn}`} onClick={onPasteWod}>
            <Clipboard size={20} /> Pegar WOD
          </button>
          {items.length === 0 && lastForRepeat && (
            <button type="button" className={`btn ${s.accentBtn}`} onClick={() => onRepeat(lastForRepeat)}>
              <Repeat size={20} /> Repetir «{lastForRepeat.title ?? formatShortDate(lastForRepeat.date)}»
            </button>
          )}
        </div>
      </Card>

      {!isLive && (
        <>
          <CaloriesCard workout={workout} exercises={exercises} onUpdate={onUpdate} />
          <Card title="Notas">
            <textarea
              key={`${workout.id}:${workout.notes ?? ''}`}
              className={s.textarea}
              style={{ minHeight: 88 }}
              aria-label="Notas del entreno"
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

      <button type="button" className={`btn btn-plain ${s.discard}`} onClick={onDiscard}>
        {isLive ? 'Descartar entreno' : 'Borrar entreno'}
      </button>
      {children}
      {isLive && restEnd !== null && <RestTimer key={restEnd} endsAt={restEnd} onDone={stopRest} />}
    </div>
  )
}

/** Duración (en vivo si está en curso), volumen y series. Se repinta cada segundo solo esta parte. */
function LiveStats({ workout, isLive }: { workout: Workout; isLive: boolean }) {
  const { value: cfg } = useGymSettings()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!isLive) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [isLive])
  const st = sessionStats(workout.workout_items)
  return (
    <div className={s.liveStats}>
      <div className={s.stat}>
        <span className={s.statValue} role={isLive ? 'timer' : undefined}>
          {isLive
            ? formatElapsed(workout.started_at, now)
            : workout.duration_min
              ? `${workout.duration_min} min`
              : '—'}
        </span>
        <span className={s.statLabel}>Duración</span>
      </div>
      <div className={s.stat}>
        <span className={s.statValue}>{st.volume ? formatVolume(st.volume, cfg.weight_unit) : '—'}</span>
        <span className={s.statLabel}>Volumen</span>
      </div>
      <div className={s.stat}>
        <span className={s.statValue}>
          {st.done}/{st.total}
        </span>
        <span className={s.statLabel}>Series</span>
      </div>
    </div>
  )
}
