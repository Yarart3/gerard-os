import type { QueryClient } from '@tanstack/react-query'
import type { Tables } from '../../lib/database.types'
import { mapLists, nowIso, removeRow } from '../../lib/offline/cache'
import { db, deleteRow, insertOnce, updateRow } from '../../lib/offline/db'
import { defineOffline } from '../../lib/offline/define'
import { fail } from '../../lib/offline/errors'
import { newId } from '../../lib/offline/ids'
import { offlineKeys } from '../../lib/offline/keys'

type Meal = Tables<'meals'> & { meal_items: Tables<'meal_items'>[] }

export type AddMealItemVars = {
  date: string
  slot: string
  grams: number
  food_id?: string
  recipe_id?: string
  /** IDs puestos por el cliente: `mealId` solo se usa si la comida aún no existe. */
  itemId: string
  mealId: string
}

const stamp = () => ({ created_at: nowIso(), updated_at: nowIso(), user_id: '' })

/** Busca en caché la comida de ese día y momento (puede estar en la consulta del día o en la de la semana). */
export function findCachedMeal(qc: QueryClient, date: string, slot: string): Meal | undefined {
  for (const [, list] of qc.getQueriesData<Meal[]>({ queryKey: ['meals'] })) {
    const m = list?.find((x) => x.date === date && x.slot === slot)
    if (m) return m
  }
  return undefined
}

export function prepareAddMealItem(
  qc: QueryClient,
  v: Omit<AddMealItemVars, 'itemId' | 'mealId'>,
): AddMealItemVars {
  return { ...v, itemId: newId(), mealId: findCachedMeal(qc, v.date, v.slot)?.id ?? newId() }
}

export function registerNutritionMutations(qc: QueryClient) {
  defineOffline<AddMealItemVars>(qc, {
    key: offlineKeys.mealAddItem,
    // La comida del día puede existir ya en el servidor con otro ID (otro dispositivo): se localiza por
    // (fecha, momento) y solo se crea si falta, sin tocar nunca el ID de una existente.
    run: async (v) => {
      fail(
        (
          await db
            .from('meals')
            .upsert(
              { id: v.mealId, date: v.date, slot: v.slot },
              { onConflict: 'user_id,date,slot', ignoreDuplicates: true },
            )
        ).error,
      )
      const found = await db
        .from('meals')
        .select('id, meal_items(position)')
        .eq('date', v.date)
        .eq('slot', v.slot)
        .single()
      fail(found.error)
      const meal = found.data as { id: string; meal_items: { position: number }[] }
      const position = Math.max(-1, ...meal.meal_items.map((i) => i.position)) + 1
      await insertOnce('meal_items', {
        id: v.itemId,
        meal_id: meal.id,
        food_id: v.food_id ?? null,
        recipe_id: v.recipe_id ?? null,
        grams: v.grams,
        position,
      })
    },
    invalidate: [['meals']],
    optimistic: (c, v) => {
      const mk = (position: number) =>
        ({
          id: v.itemId,
          meal_id: v.mealId,
          food_id: v.food_id ?? null,
          recipe_id: v.recipe_id ?? null,
          grams: v.grams,
          position,
          ...stamp(),
        }) as Tables<'meal_items'>
      let placed = false
      mapLists<Meal>(c, ['meals'], (list, key) => {
        const [, from, to] = key as [string, string, string]
        if (typeof from !== 'string' || v.date < from || v.date > to) return list
        placed = true
        const meal = list.find((m) => m.date === v.date && m.slot === v.slot)
        if (!meal)
          return [
            ...list,
            { id: v.mealId, date: v.date, slot: v.slot, ...stamp(), meal_items: [mk(0)] } as Meal,
          ]
        if (meal.meal_items.some((i) => i.id === v.itemId)) return list
        const position = Math.max(-1, ...meal.meal_items.map((i) => i.position)) + 1
        return list.map((m) => (m === meal ? { ...m, meal_items: [...m.meal_items, mk(position)] } : m))
      })
      // Día sin consulta en caché (p. ej. un día nuevo sin red): se crea la de ese día.
      if (!placed) {
        c.setQueryData<Meal[]>(
          ['meals', v.date, v.date],
          [{ id: v.mealId, date: v.date, slot: v.slot, ...stamp(), meal_items: [mk(0)] } as Meal],
        )
      }
    },
  })

  defineOffline<{ id: string; grams: number }>(qc, {
    key: offlineKeys.mealUpdateItem,
    run: ({ id, grams }) => updateRow('meal_items', id, { grams }),
    invalidate: [['meals']],
    optimistic: (c, { id, grams }) =>
      mapLists<Meal>(c, ['meals'], (list) =>
        list.map((m) => ({ ...m, meal_items: m.meal_items.map((i) => (i.id === id ? { ...i, grams } : i)) })),
      ),
  })

  defineOffline<string>(qc, {
    key: offlineKeys.mealDeleteItem,
    run: (id) => deleteRow('meal_items', id),
    invalidate: [['meals']],
    optimistic: (c, id) =>
      mapLists<Meal>(c, ['meals'], (list) =>
        list.map((m) => ({ ...m, meal_items: removeRow(m.meal_items, id) })),
      ),
  })
}
