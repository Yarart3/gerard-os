import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Tables, TablesInsert, TablesUpdate } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'
import { withNewId } from '../../lib/offline/ids'
import { offlineKeys } from '../../lib/offline/keys'
import { useOfflineMutation } from '../../lib/offline/useOfflineMutation'
import { gymKeys } from './keys'
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

/** Sesión de un día (la primera si hubiera varias). */
export function useWorkoutOn(date: string) {
  return useQuery({
    queryKey: gymKeys.workout(date),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select('*, workout_items(*, sets(*))')
        .eq('date', date)
        .order('created_at')
        .limit(1)
        .maybeSingle()
      fail(error)
      return data ? sortWorkout(data) : null
    },
  })
}

export type HistoryWorkout = Omit<HistWorkout, 'items'> & {
  notes: string | null
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
          'id, date, duration_min, met_kcal, watch_kcal, notes, workout_items(id, exercise_id, position, sets(position, weight_kg, reps, seconds, meters, calories, done))',
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
        notes: w.notes,
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

/** Últimas series de un ejercicio en una sesión anterior a `date`. */
export function lastSetsOf(
  history: readonly HistoryWorkout[],
  exerciseId: string,
  date: string,
): SetValues[] {
  for (const w of history) {
    if (w.date >= date) continue
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

/** Añade ejercicios (al final, en el orden dado) con sus series. Crea la sesión si no existe. Funciona sin red. */
export function useAddItems(date: string, workout: Workout | null | undefined) {
  return useOfflineMutation(offlineKeys.gymAddItems, (v: { items: NewItem[]; notes?: string }, qc) =>
    prepareAddItems(qc, date, workout, v),
  )
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
