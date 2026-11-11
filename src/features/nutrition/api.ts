import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Tables, TablesInsert } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'
import type { Macros, RecipeLike } from './logic/macros'

export type Food = Tables<'foods'>
export type RecipeItem = Tables<'recipe_items'>
export type Recipe = Tables<'recipes'> & { recipe_items: RecipeItem[] }
export type MealItem = Tables<'meal_items'>
export type Meal = Tables<'meals'> & { meal_items: MealItem[] }

function fail(error: { message: string; code?: string } | null) {
  if (error?.code === '23503') throw new Error('in-use')
  if (error?.code === '23505') throw new Error('duplicate')
  if (error) throw new Error(error.message)
}

export function useFoods() {
  return useQuery({
    queryKey: ['foods'],
    queryFn: async () => {
      const { data, error } = await supabase.from('foods').select('*').order('name')
      fail(error)
      return data ?? []
    },
  })
}

export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('recipes').select('*, recipe_items(*)').order('name')
      fail(error)
      return (data ?? []).map((r) => ({
        ...r,
        recipe_items: [...r.recipe_items].sort((a, b) => a.position - b.position),
      }))
    },
  })
}

/** Comidas entre dos fechas (incluidas). */
export function useMeals(from: string, to: string) {
  return useQuery({
    queryKey: ['meals', from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meals')
        .select('*, meal_items(*)')
        .gte('date', from)
        .lte('date', to)
      fail(error)
      return (data ?? []).map((m) => ({
        ...m,
        meal_items: [...m.meal_items].sort((a, b) => a.position - b.position),
      }))
    },
  })
}

/** Mapas para los cálculos de `logic/macros`. */
export function useNutritionMaps() {
  const foods = useFoods()
  const recipes = useRecipes()
  const maps = useMemo(() => {
    const foodMap = new Map<string, Food & Macros>((foods.data ?? []).map((f) => [f.id, f]))
    const recipeMap = new Map<string, Recipe & RecipeLike>(
      (recipes.data ?? []).map((r) => [r.id, { ...r, items: r.recipe_items }]),
    )
    return { foodMap, recipeMap }
  }, [foods.data, recipes.data])
  return {
    ...maps,
    foods: foods.data ?? [],
    recipes: recipes.data ?? [],
    isLoading: foods.isLoading || recipes.isLoading,
  }
}

function useNutritionMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSettled: () =>
      Promise.all(['foods', 'recipes', 'meals'].map((k) => qc.invalidateQueries({ queryKey: [k] }))),
  })
}

export function useSaveFood() {
  return useNutritionMutation(async (f: TablesInsert<'foods'>) => {
    const { error } = f.id
      ? await supabase.from('foods').update(f).eq('id', f.id)
      : await supabase.from('foods').insert(f)
    fail(error)
  })
}

export function useDeleteFood() {
  return useNutritionMutation(async (id: string) => {
    const { error } = await supabase.from('foods').delete().eq('id', id)
    fail(error)
  })
}

export type RecipeDraft = {
  id?: string
  name: string
  notes: string | null
  items: { food_id: string; grams: number }[]
}

/** Guarda la receta y sustituye sus ingredientes. */
export function useSaveRecipe() {
  return useNutritionMutation(async (r: RecipeDraft) => {
    const row = { name: r.name, notes: r.notes }
    const { data, error } = r.id
      ? await supabase.from('recipes').update(row).eq('id', r.id).select('id').single()
      : await supabase.from('recipes').insert(row).select('id').single()
    fail(error)
    const id = data!.id
    const del = await supabase.from('recipe_items').delete().eq('recipe_id', id)
    fail(del.error)
    if (r.items.length) {
      const ins = await supabase
        .from('recipe_items')
        .insert(
          r.items.map((it, position) => ({ recipe_id: id, food_id: it.food_id, grams: it.grams, position })),
        )
      fail(ins.error)
    }
  })
}

export function useDeleteRecipe() {
  return useNutritionMutation(async (id: string) => {
    const { error } = await supabase.from('recipes').delete().eq('id', id)
    fail(error)
  })
}

/** Añade un alimento o receta a una comida (crea la comida del día si no existe). */
export function useAddMealItem() {
  return useNutritionMutation(
    async (v: { date: string; slot: string; food_id?: string; recipe_id?: string; grams: number }) => {
      const { data: meal, error } = await supabase
        .from('meals')
        .upsert({ date: v.date, slot: v.slot }, { onConflict: 'user_id,date,slot' })
        .select('id, meal_items(position)')
        .single()
      fail(error)
      const position = Math.max(-1, ...(meal!.meal_items ?? []).map((i) => i.position)) + 1
      const ins = await supabase.from('meal_items').insert({
        meal_id: meal!.id,
        food_id: v.food_id ?? null,
        recipe_id: v.recipe_id ?? null,
        grams: v.grams,
        position,
      })
      fail(ins.error)
    },
  )
}

export function useUpdateMealItem() {
  return useNutritionMutation(async ({ id, grams }: { id: string; grams: number }) => {
    const { error } = await supabase.from('meal_items').update({ grams }).eq('id', id)
    fail(error)
  })
}

export function useDeleteMealItem() {
  return useNutritionMutation(async (id: string) => {
    const { error } = await supabase.from('meal_items').delete().eq('id', id)
    fail(error)
  })
}
