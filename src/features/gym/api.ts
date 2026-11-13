import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Tables, TablesInsert, TablesUpdate } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'
import { newId, withNewId } from '../../lib/offline/ids'
import { offlineKeys } from '../../lib/offline/keys'
import { useOfflineMutation } from '../../lib/offline/useOfflineMutation'
import { gymKeys } from './keys'
import { estimateOf } from './energy'
import { prepareAddItems } from './offline'
import type { HistWorkout } from './logic/stats'
import type { SetValues } from './logic/types'

export type Exercise = Tables<'exercises'>
export type SetRow = Tables<'sets'>
export type WorkoutItem = Tables<'workout_items'> & { sets: SetRow[] }
export type Workout = Tables<'workouts'> & { workout_items: WorkoutItem[] }

export { gymKeys }

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export function useExercises() {
  return useQuery({
    queryKey: gymKeys.exercises,
    queryFn: async () => {
      const { data, error } = await supabase.from('exercises').select('*').order('name')
      fail(error)
      return data ?? []
    },
  })
}

const sortWorkout = (w: Workout): Workout => ({
  ...w,
  workout_items: [...w.workout_items]
    .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
    .map((it) => ({ ...it, sets: [...it.sets].sort((a, b) => a.position - b.position) })),
})

const WORKOUT_SELECT = '*, workout_items(*, sets(*))'

/** Entreno en curso (el más reciente sin terminar), o null. */
export function useActiveWorkout() {
  return useQuery({
    queryKey: gymKeys.active,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select(WORKOUT_SELECT)
        .is('finished_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      fail(error)
      return data ? sortWorkout(data) : null
    },
  })
}

/** Un entreno concreto con sus ejercicios y series. */
export function useWorkout(id: string | null) {
  return useQuery({
    queryKey: gymKeys.workout(id ?? ''),
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('workouts').select(WORKOUT_SELECT).eq('id', id!).maybeSingle()
      fail(error)
      return data ? sortWorkout(data) : null
    },
  })
}

export type HistoryWorkout = Omit<HistWorkout, 'items'> & {
  notes: string | null
  title: string | null
  started_at: string | null
  finished_at: string | null
  items: (HistWorkout['items'][number] & { id: string; position: number })[]
}

/** Historial (más reciente primero) en el formato de `logic/stats`. */
export function useWorkoutHistory() {
  return useQuery({
    queryKey: gymKeys.history,
    queryFn: async (): Promise<HistoryWorkout[]> => {
      const { data, error } = await supabase
        .from('workouts')
        .select(
          'id, date, title, started_at, finished_at, duration_min, met_kcal, watch_kcal, energy, notes, workout_items(id, exercise_id, position, sets(position, weight_kg, added_kg, reps, seconds, meters, calories, done))',
        )
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500)
      fail(error)
      return (data ?? []).map((w) => ({
        id: w.id,
        date: w.date,
        duration_min: w.duration_min,
        met_kcal: w.met_kcal,
        watch_kcal: w.watch_kcal,
        est_kcal: estimateOf(w.energy),
        notes: w.notes,
        title: w.title,
        started_at: w.started_at,
        finished_at: w.finished_at,
        items: [...w.workout_items]
          .sort((a, b) => a.position - b.position)
          .map((it) => ({
            id: it.id,
            position: it.position,
            exercise_id: it.exercise_id,
            sets: [...it.sets].sort((a, b) => a.position - b.position),
          })),
      }))
    },
  })
}

/** Entrenos terminados de un día (del historial, en orden de inicio). */
export function useDayWorkouts(date: string) {
  const q = useWorkoutHistory()
  const list = (q.data ?? [])
    .filter((w) => w.date === date && w.finished_at)
    .sort((a, b) => (a.started_at ?? '').localeCompare(b.started_at ?? ''))
  return { ...q, data: list }
}

/**
 * Últimas series de un ejercicio en el entreno terminado más reciente (sin contar `excludeId`).
 * Con `upTo` (al editar uno pasado) solo mira entrenos de esa fecha o anteriores.
 */
export function lastSetsOf(
  history: readonly HistoryWorkout[],
  exerciseId: string,
  excludeId?: string,
  upTo?: string,
): SetValues[] {
  for (const w of history) {
    if (w.id === excludeId || !w.finished_at || (upTo && w.date > upTo)) continue
    const item = w.items.find((i) => i.exercise_id === exerciseId)
    if (item?.sets.length) return item.sets
  }
  return []
}

/** Mutación que, al terminar, refresca todo lo de Gym. */
function useGymMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['workout'] }),
        qc.invalidateQueries({ queryKey: ['workouts'] }),
        qc.invalidateQueries({ queryKey: gymKeys.exercises }),
      ]),
  })
}

// ---------- Ejercicios ----------
export function useSaveExercise() {
  return useGymMutation(async (ex: TablesInsert<'exercises'>) => {
    const { data, error } = ex.id
      ? await supabase.from('exercises').update(ex).eq('id', ex.id).select().single()
      : await supabase.from('exercises').insert(ex).select().single()
    fail(error)
    return data as Exercise
  })
}

export function useDeleteExercise() {
  return useGymMutation(async (id: string) => {
    const { error } = await supabase.from('exercises').delete().eq('id', id)
    if (error?.code === '23503') throw new Error('in-use')
    fail(error)
  })
}

// ---------- Sesiones ----------
export type NewItem = { exercise_id: string; sets: SetValues[] }

/** Empieza un entreno vacío (pasa a ser el entreno en curso). Funciona sin red. */
export function useStartWorkout() {
  return useOfflineMutation(offlineKeys.gymStartWorkout, (v: { date: string; title: string }) => ({
    id: newId(),
    started_at: new Date().toISOString(),
    ...v,
  }))
}

/** Añade ejercicios (al final, en el orden dado) a `workout`; si no hay, empieza uno nuevo. Funciona sin red. */
export function useAddItems(date: string, workout: Workout | null | undefined) {
  return useOfflineMutation(
    offlineKeys.gymAddItems,
    (v: { items: NewItem[]; notes?: string; title?: string }, qc) => prepareAddItems(qc, date, workout, v),
  )
}

export function useUpdateItem() {
  return useOfflineMutation<{ id: string; patch: TablesUpdate<'workout_items'> }>(offlineKeys.gymUpdateItem)
}

export function useUpdateWorkout() {
  return useOfflineMutation<{ id: string; patch: TablesUpdate<'workouts'> }>(offlineKeys.gymUpdateWorkout)
}

export function useDeleteWorkout() {
  return useOfflineMutation<string>(offlineKeys.gymDeleteWorkout)
}

export function useDeleteItem() {
  return useOfflineMutation<string>(offlineKeys.gymDeleteItem)
}

/** Intercambia la posición de dos ejercicios de la sesión. */
export function useSwapItems() {
  return useOfflineMutation(
    offlineKeys.gymSwapItems,
    ([a, b]: [WorkoutItem, WorkoutItem]) =>
      [
        { id: a.id, position: a.position },
        { id: b.id, position: b.position },
      ] as [Pick<WorkoutItem, 'id' | 'position'>, Pick<WorkoutItem, 'id' | 'position'>],
  )
}

export function useAddSet() {
  return useOfflineMutation(offlineKeys.gymAddSet, (s: TablesInsert<'sets'>) => withNewId(s))
}

/** Actualiza una serie con respuesta optimista (marcar hecha no espera a la red). */
export function useUpdateSet() {
  return useOfflineMutation<{ id: string; patch: TablesUpdate<'sets'> }>(offlineKeys.gymUpdateSet)
}

export function useDeleteSet() {
  return useOfflineMutation<string>(offlineKeys.gymDeleteSet)
}
