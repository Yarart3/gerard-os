import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Tables, TablesInsert, TablesUpdate } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'
import type { HistWorkout } from './logic/stats'
import type { SetValues } from './logic/types'

export type Exercise = Tables<'exercises'>
export type SetRow = Tables<'sets'>
export type WorkoutItem = Tables<'workout_items'> & { sets: SetRow[] }
export type Workout = Tables<'workouts'> & { workout_items: WorkoutItem[] }

export const gymKeys = {
  exercises: ['exercises'] as const,
  workout: (date: string) => ['workout', date] as const,
  history: ['workouts', 'history'] as const,
}

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
async function ensureWorkout(date: string, existing: Workout | null | undefined): Promise<string> {
  if (existing) return existing.id
  const { data, error } = await supabase
    .from('workouts')
    .insert({ date, started_at: new Date().toISOString() })
    .select('id')
    .single()
  fail(error)
  return data!.id
}

export type NewItem = { exercise_id: string; sets: SetValues[] }

/** Añade ejercicios (al final, en el orden dado) con sus series. Crea la sesión si no existe. */
export function useAddItems(date: string, workout: Workout | null | undefined) {
  return useGymMutation(async ({ items, notes }: { items: NewItem[]; notes?: string }) => {
    const workoutId = await ensureWorkout(date, workout)
    if (notes !== undefined) {
      const { error } = await supabase.from('workouts').update({ notes }).eq('id', workoutId)
      fail(error)
    }
    if (!items.length) return
    const start = (workout?.workout_items.at(-1)?.position ?? -1) + 1
    const { data, error } = await supabase
      .from('workout_items')
      .insert(
        items.map((it, i) => ({ workout_id: workoutId, exercise_id: it.exercise_id, position: start + i })),
      )
      .select('id, position')
    fail(error)
    const byPos = new Map((data ?? []).map((r) => [r.position, r.id]))
    const sets = items.flatMap((it, i) =>
      it.sets.map((s, position) => ({ ...s, item_id: byPos.get(start + i)!, position, done: false })),
    )
    if (sets.length) {
      const res = await supabase.from('sets').insert(sets)
      fail(res.error)
    }
  })
}

export function useUpdateWorkout() {
  return useGymMutation(async ({ id, patch }: { id: string; patch: TablesUpdate<'workouts'> }) => {
    const { error } = await supabase.from('workouts').update(patch).eq('id', id)
    fail(error)
  })
}

export function useDeleteWorkout() {
  return useGymMutation(async (id: string) => {
    const { error } = await supabase.from('workouts').delete().eq('id', id)
    fail(error)
  })
}

export function useDeleteItem() {
  return useGymMutation(async (id: string) => {
    const { error } = await supabase.from('workout_items').delete().eq('id', id)
    fail(error)
  })
}

/** Intercambia la posición de dos ejercicios de la sesión. */
export function useSwapItems() {
  return useGymMutation(async ([a, b]: [WorkoutItem, WorkoutItem]) => {
    const r1 = await supabase.from('workout_items').update({ position: b.position }).eq('id', a.id)
    fail(r1.error)
    const r2 = await supabase.from('workout_items').update({ position: a.position }).eq('id', b.id)
    fail(r2.error)
  })
}

export function useAddSet() {
  return useGymMutation(async (s: TablesInsert<'sets'>) => {
    const { error } = await supabase.from('sets').insert(s)
    fail(error)
  })
}

/** Actualiza una serie con respuesta optimista (marcar hecha no debe esperar a la red). */
export function useUpdateSet(date: string) {
  const qc = useQueryClient()
  const key = gymKeys.workout(date)
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<'sets'> }) => {
      const { error } = await supabase.from('sets').update(patch).eq('id', id)
      fail(error)
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<Workout | null>(key)
      if (previous)
        qc.setQueryData<Workout>(key, {
          ...previous,
          workout_items: previous.workout_items.map((it) => ({
            ...it,
            sets: it.sets.map((s) => (s.id === id ? { ...s, ...patch } : s)),
          })),
        })
      return { previous }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.previous),
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: key }),
        qc.invalidateQueries({ queryKey: ['workouts'] }),
      ]),
  })
}

export function useDeleteSet() {
  return useGymMutation(async (id: string) => {
    const { error } = await supabase.from('sets').delete().eq('id', id)
    fail(error)
  })
}
