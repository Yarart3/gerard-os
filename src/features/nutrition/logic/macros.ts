// Macros de alimentos (por 100 g), recetas (suma de ingredientes) y comidas.

export type Macros = { kcal: number; protein: number; carbs: number; fat: number; fiber: number }
export const MACRO_KEYS = ['kcal', 'protein', 'carbs', 'fat', 'fiber'] as const
export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }

export type FoodLike = Macros & { id: string }
export type RecipeItemLike = { food_id: string; grams: number }
export type RecipeLike = { id: string; items: RecipeItemLike[] }

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    fiber: a.fiber + b.fiber,
  }
}

export const scaleMacros = (m: Macros, factor: number): Macros => ({
  kcal: m.kcal * factor,
  protein: m.protein * factor,
  carbs: m.carbs * factor,
  fat: m.fat * factor,
  fiber: m.fiber * factor,
})

export const sumMacros = (list: readonly Macros[]) => list.reduce(addMacros, ZERO)

/** Macros de `grams` gramos de un alimento con valores por 100 g. */
export const foodMacros = (food: Macros, grams: number) => scaleMacros(food, grams / 100)

/** Totales de una receta y su peso total. Los ingredientes sin alimento conocido se ignoran. */
export function recipeTotals(recipe: RecipeLike, foods: ReadonlyMap<string, Macros>) {
  let grams = 0
  let total = ZERO
  for (const it of recipe.items) {
    const food = foods.get(it.food_id)
    if (!food) continue
    grams += it.grams
    total = addMacros(total, foodMacros(food, it.grams))
  }
  return { total, grams }
}

/** Macros por 100 g de receta (para registrar raciones en gramos). */
export function recipePer100(recipe: RecipeLike, foods: ReadonlyMap<string, Macros>): Macros {
  const { total, grams } = recipeTotals(recipe, foods)
  return grams > 0 ? scaleMacros(total, 100 / grams) : ZERO
}

export type MealItemLike = { food_id: string | null; recipe_id: string | null; grams: number }

/** Macros de una línea del registro (alimento o receta + gramos). */
export function mealItemMacros(
  item: MealItemLike,
  foods: ReadonlyMap<string, Macros>,
  recipes: ReadonlyMap<string, RecipeLike>,
): Macros {
  if (item.food_id) {
    const f = foods.get(item.food_id)
    return f ? foodMacros(f, item.grams) : ZERO
  }
  if (item.recipe_id) {
    const r = recipes.get(item.recipe_id)
    return r ? foodMacros(recipePer100(r, foods), item.grams) : ZERO
  }
  return ZERO
}

/** kcal que aportan los macros (4/4/9) — útil para repartir objetivos. */
export const kcalFromMacros = (protein: number, carbs: number, fat: number) =>
  protein * 4 + carbs * 4 + fat * 9
