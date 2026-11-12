import type { QueryClient } from '@tanstack/react-query'
import type { Tables, TablesInsert, TablesUpdate } from '../../lib/database.types'
import { mapLists, nowIso } from '../../lib/offline/cache'
import { deleteRow, insertOnce, updateRow } from '../../lib/offline/db'
import { defineOffline } from '../../lib/offline/define'
import { newId, rowOf, type SaveVars } from '../../lib/offline/ids'
import { offlineKeys } from '../../lib/offline/keys'
import { gymKeys } from './keys'
import type { SetValues } from './logic/types'

type SetRow = Tables<'sets'>
type Item = Tables<'workout_items'> & { sets: SetRow[] }
type Workout = Tables<'workouts'> & { workout_items: Item[] }
type History = { id: string; date: string }

const stamp = () => ({ created_at: nowIso(), updated_at: nowIso(), user_id: '' })

export type AddItemsVars = {
  date: string
  workoutId: string
  startedAt: string
  notes?: string
  items: { id: string; exercise_id: string; position: number; sets: (SetValues & { id: string })[] }[]
}

/** Fija IDs y posiciones al encolar (leyendo la sesión del día de la caché) para que un reintento sea idéntico. */
export function prepareAddItems(
  qc: QueryClient,
  date: string,
  fallback: Workout | null | undefined,
  v: { items: { exercise_id: string; sets: SetValues[] }[]; notes?: string },
): AddItemsVars {
  const current = qc.getQueryData<Workout | null>(gymKeys.workout(date)) ?? fallback
  const start = (current?.workout_items.at(-1)?.position ?? -1) + 1
  return {
    date,
    workoutId: current?.id ?? newId(),
    startedAt: nowIso(),
    notes: v.notes,
    items: v.items.map((it, i) => ({
      id: newId(),
      exercise_id: it.exercise_id,
      position: start + i,
      sets: it.sets.map((s) => ({ ...s, id: newId() })),
    })),
  }
}

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
      await insertOnce('workouts', { id: v.workoutId, date: v.date, started_at: v.startedAt })
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
      const key = gymKeys.workout(v.date)
      const cur = c.getQueryData<Workout | null>(key)
      if (cur) {
        if (items.some((i) => cur.workout_items.some((x) => x.id === i.id))) return
        c.setQueryData<Workout>(key, {
          ...cur,
          notes: v.notes ?? cur.notes,
          workout_items: [...cur.workout_items, ...items],
        })
      } else {
        c.setQueryData<Workout>(key, {
          id: v.workoutId,
          date: v.date,
          started_at: v.startedAt,
          duration_min: null,
          met_kcal: null,
          watch_kcal: null,
          notes: v.notes ?? null,
          kind: 'strength',
          result: null,
          health_synced_at: null,
          ...stamp(),
          workout_items: items,
        })
      }
    },
  })

  defineOffline<{ id: string; patch: TablesUpdate<'workouts'> }>(qc, {
    key: offlineKeys.gymUpdateWorkout,
    invalidate,
    run: ({ id, patch }) => updateRow('workouts', id, patch),
    optimistic: (c, { id, patch }) =>
      mapWorkouts(c, (w) => (w.id === id ? ({ ...w, ...patch } as Workout) : w)),
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
