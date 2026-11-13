import type { QueryClient } from '@tanstack/react-query'
import type { Tables, TablesInsert, TablesUpdate } from '../../lib/database.types'
import { mapLists, nowIso } from '../../lib/offline/cache'
import { deleteRow, insertOnce, updateRow } from '../../lib/offline/db'
import { defineOffline } from '../../lib/offline/define'
import { newId, rowOf, type SaveVars } from '../../lib/offline/ids'
import { offlineKeys } from '../../lib/offline/keys'
import { estimateOf } from './energy'
import { gymKeys } from './keys'
import type { SetValues } from './logic/types'

type SetRow = Tables<'sets'>
type Item = Tables<'workout_items'> & { sets: SetRow[] }
type Workout = Tables<'workouts'> & { workout_items: Item[] }
type History = {
  id: string
  date: string
  title: string | null
  started_at: string | null
  finished_at: string | null
  duration_min: number | null
  met_kcal: number | null
  watch_kcal: number | null
  est_kcal?: number | null
  notes: string | null
  items: { id: string; position: number; exercise_id: string; sets: SetValues[] }[]
}

const stamp = () => ({ created_at: nowIso(), updated_at: nowIso(), user_id: '' })

export type AddItemsVars = {
  date: string
  workoutId: string
  startedAt: string
  notes?: string
  title?: string
  items: { id: string; exercise_id: string; position: number; sets: (SetValues & { id: string })[] }[]
}

/** Busca un entreno en caché (en curso o abierto para editar). */
function cachedWorkout(qc: QueryClient, id: string): Workout | null {
  for (const [, data] of qc.getQueriesData<Workout | null>({ queryKey: ['workout'] })) {
    if (data?.id === id) return data
  }
  return null
}

/** Fija IDs y posiciones al encolar (leyendo el entreno de la caché) para que un reintento sea idéntico. */
export function prepareAddItems(
  qc: QueryClient,
  date: string,
  target: Workout | null | undefined,
  v: { items: { exercise_id: string; sets: SetValues[] }[]; notes?: string; title?: string },
): AddItemsVars {
  const current = (target && cachedWorkout(qc, target.id)) ?? target
  const start = (current?.workout_items.at(-1)?.position ?? -1) + 1
  return {
    date: current?.date ?? date,
    workoutId: current?.id ?? newId(),
    startedAt: current?.started_at ?? nowIso(),
    notes: v.notes,
    title: current ? undefined : v.title,
    items: v.items.map((it, i) => ({
      id: newId(),
      exercise_id: it.exercise_id,
      position: start + i,
      sets: it.sets.map((s) => ({ ...s, id: newId() })),
    })),
  }
}

const emptyWorkout = (v: { id: string; date: string; started_at: string; title?: string | null; notes?: string | null }): Workout => ({
  id: v.id,
  date: v.date,
  started_at: v.started_at,
  title: v.title ?? null,
  finished_at: null,
  duration_min: null,
  met_kcal: null,
  watch_kcal: null,
  notes: v.notes ?? null,
  kind: 'strength',
  result: null,
  energy: null,
  health_synced_at: null,
  ...stamp(),
  workout_items: [],
})

/** Entreno (con ejercicios) → fila del historial. */
const toHistory = (w: Workout): History => ({
  id: w.id,
  date: w.date,
  title: w.title,
  started_at: w.started_at,
  finished_at: w.finished_at,
  duration_min: w.duration_min,
  met_kcal: w.met_kcal,
  watch_kcal: w.watch_kcal,
  est_kcal: estimateOf(w.energy),
  notes: w.notes,
  items: w.workout_items.map((i) => ({ id: i.id, position: i.position, exercise_id: i.exercise_id, sets: i.sets })),
})

/** Aplica `fn` a todas las sesiones en caché (consulta por día) y a la clave `workout` de cada una. */
function mapWorkouts(qc: QueryClient, fn: (w: Workout) => Workout | null) {
  for (const [key, data] of qc.getQueriesData<Workout | null>({ queryKey: ['workout'] })) {
    if (data) qc.setQueryData(key, fn(data))
  }
}

const mapItems = (w: Workout, fn: (i: Item) => Item): Workout => ({
  ...w,
  workout_items: w.workout_items.map(fn),
})

export function registerGymMutations(qc: QueryClient) {
  const invalidate = [['workout'], ['workouts']] as const

  defineOffline<AddItemsVars>(qc, {
    key: offlineKeys.gymAddItems,
    invalidate,
    run: async (v) => {
      await insertOnce('workouts', {
        id: v.workoutId,
        date: v.date,
        started_at: v.startedAt,
        ...(v.title ? { title: v.title } : {}),
      })
      if (v.notes !== undefined) await updateRow('workouts', v.workoutId, { notes: v.notes })
      await insertOnce(
        'workout_items',
        v.items.map((it) => ({
          id: it.id,
          workout_id: v.workoutId,
          exercise_id: it.exercise_id,
          position: it.position,
        })),
      )
      await insertOnce(
        'sets',
        v.items.flatMap((it) =>
          it.sets.map((s, position) => ({ ...s, item_id: it.id, position, done: false })),
        ),
      )
    },
    optimistic: (c, v) => {
      const items: Item[] = v.items.map((it) => ({
        id: it.id,
        workout_id: v.workoutId,
        exercise_id: it.exercise_id,
        position: it.position,
        notes: null,
        ...stamp(),
        sets: it.sets.map(
          (s, position) => ({ ...stamp(), ...s, item_id: it.id, position, done: false }) as SetRow,
        ),
      }))
      const cur = cachedWorkout(c, v.workoutId)
      if (cur) {
        if (items.some((i) => cur.workout_items.some((x) => x.id === i.id))) return
        mapWorkouts(c, (w) =>
          w.id === v.workoutId
            ? { ...w, notes: v.notes ?? w.notes, workout_items: [...w.workout_items, ...items] }
            : w,
        )
      } else {
        c.setQueryData<Workout>(gymKeys.active, {
          ...emptyWorkout({ id: v.workoutId, date: v.date, started_at: v.startedAt, title: v.title, notes: v.notes }),
          workout_items: items,
        })
      }
    },
  })

  defineOffline<{ id: string; date: string; started_at: string; title: string }>(qc, {
    key: offlineKeys.gymStartWorkout,
    invalidate,
    run: (v) => insertOnce('workouts', v),
    optimistic: (c, v) => {
      if (cachedWorkout(c, v.id)) return
      c.setQueryData<Workout>(gymKeys.active, emptyWorkout(v))
    },
  })

  defineOffline<{ id: string; patch: TablesUpdate<'workout_items'> }>(qc, {
    key: offlineKeys.gymUpdateItem,
    invalidate,
    run: ({ id, patch }) => updateRow('workout_items', id, patch),
    optimistic: (c, { id, patch }) =>
      mapWorkouts(c, (w) => mapItems(w, (i) => (i.id === id ? ({ ...i, ...patch } as Item) : i))),
  })

  defineOffline<{ id: string; patch: TablesUpdate<'workouts'> }>(qc, {
    key: offlineKeys.gymUpdateWorkout,
    invalidate,
    run: ({ id, patch }) => updateRow('workouts', id, patch),
    optimistic: (c, { id, patch }) => {
      mapWorkouts(c, (w) => (w.id === id ? ({ ...w, ...patch } as Workout) : w))
      // Al terminarlo deja de estar «en curso» y pasa al historial.
      const active = c.getQueryData<Workout | null>(gymKeys.active)
      if (active?.id === id && active.finished_at) {
        c.setQueryData(gymKeys.active, null)
        mapLists<History>(c, gymKeys.history, (l) => [toHistory(active), ...l.filter((w) => w.id !== id)])
      }
      mapLists<History>(c, gymKeys.history, (l) =>
        l.map((w) => (w.id === id ? { ...w, ...(patch as Partial<History>) } : w)),
      )
    },
  })

  defineOffline<string>(qc, {
    key: offlineKeys.gymDeleteWorkout,
    invalidate,
    run: (id) => deleteRow('workouts', id),
    optimistic: (c, id) => {
      mapWorkouts(c, (w) => (w.id === id ? null : w))
      mapLists<History>(c, gymKeys.history, (l) => l.filter((w) => w.id !== id))
    },
  })

  defineOffline<string>(qc, {
    key: offlineKeys.gymDeleteItem,
    invalidate,
    run: (id) => deleteRow('workout_items', id),
    optimistic: (c, id) =>
      mapWorkouts(c, (w) => ({ ...w, workout_items: w.workout_items.filter((i) => i.id !== id) })),
  })

  defineOffline<[Pick<Item, 'id' | 'position'>, Pick<Item, 'id' | 'position'>]>(qc, {
    key: offlineKeys.gymSwapItems,
    invalidate,
    run: async ([a, b]) => {
      await updateRow('workout_items', a.id, { position: b.position })
      await updateRow('workout_items', b.id, { position: a.position })
    },
    optimistic: (c, [a, b]) =>
      mapWorkouts(c, (w) => ({
        ...w,
        workout_items: w.workout_items
          .map((i) =>
            i.id === a.id
              ? { ...i, position: b.position }
              : i.id === b.id
                ? { ...i, position: a.position }
                : i,
          )
          .sort((x, y) => x.position - y.position),
      })),
  })

  defineOffline<SaveVars<TablesInsert<'sets'>>>(qc, {
    key: offlineKeys.gymAddSet,
    invalidate,
    run: (v) => insertOnce('sets', rowOf(v)),
    optimistic: (c, v) =>
      mapWorkouts(c, (w) =>
        mapItems(w, (i) =>
          i.id !== v.item_id || i.sets.some((s) => s.id === v.id)
            ? i
            : { ...i, sets: [...i.sets, { ...stamp(), done: false, ...v } as SetRow] },
        ),
      ),
  })

  defineOffline<{ id: string; patch: TablesUpdate<'sets'> }>(qc, {
    key: offlineKeys.gymUpdateSet,
    invalidate,
    run: ({ id, patch }) => updateRow('sets', id, patch),
    optimistic: (c, { id, patch }) =>
      mapWorkouts(c, (w) =>
        mapItems(w, (i) => ({
          ...i,
          sets: i.sets.map((s) => (s.id === id ? ({ ...s, ...patch } as SetRow) : s)),
        })),
      ),
  })

  defineOffline<string>(qc, {
    key: offlineKeys.gymDeleteSet,
    invalidate,
    run: (id) => deleteRow('sets', id),
    optimistic: (c, id) =>
      mapWorkouts(c, (w) => mapItems(w, (i) => ({ ...i, sets: i.sets.filter((s) => s.id !== id) }))),
  })
}
