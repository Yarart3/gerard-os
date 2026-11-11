/**
 * Importa la nutrición del Excel "Tracker GYM.xlsx" a Supabase (CLAUDE.md §11). Idempotente.
 *
 *   npm run import:nutrition -- --dry-run            # solo lee y muestra el informe
 *   npm run import:nutrition                         # escribe en Supabase
 *   npm run import:nutrition -- --file=ruta.xlsx --year=2026
 *
 * Variables (en .env.local, nunca en el repo):
 *   VITE_SUPABASE_URL           URL del proyecto
 *   SUPABASE_SERVICE_ROLE_KEY   clave service_role (solo local; salta RLS)
 *   IMPORT_USER_ID              uuid del usuario dueño de los datos (Authentication → Users)
 *
 * Idempotencia: alimentos y recetas se emparejan por nombre (sin mayúsculas ni acentos) y se
 * actualizan; las comidas se emparejan por (fecha, momento) y sus líneas se sustituyen.
 */
import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'
import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'
import type { Database } from '../src/lib/database.types'
import { todayISO } from '../src/lib/dates'
import {
  cleanName,
  nameKey,
  parseFoods,
  parseMenu,
  parseRecipes,
  resolveWeekYears,
  type Row,
  type Skip,
} from '../src/features/nutrition/import/excelParse'

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k ?? '', v ?? 'true'] as const
  }),
)
const DRY = args.has('dry-run')
const FILE = args.get('file') ?? 'data-import/Tracker GYM.xlsx'
const YEAR = args.has('year') ? Number(args.get('year')) : undefined

function sheetRows(wb: ExcelJS.Workbook, name: string): Row[] {
  const ws = wb.getWorksheet(name)
  if (!ws) throw new Error(`Falta la hoja "${name}"`)
  const rows: Row[] = []
  for (let n = 1; n <= ws.rowCount; n++) {
    const values = ws.getRow(n).values
    rows.push(Array.isArray(values) ? values.slice(1) : [])
  }
  return rows
}

function printSkips(title: string, skips: Skip[]) {
  if (!skips.length) return
  console.log(`\n${title} (${skips.length}):`)
  for (const s of skips) console.log(`  · ${s.sheet} fila ${s.row}: ${s.reason}`)
}

async function main() {
  if (!existsSync(FILE)) throw new Error(`No existe ${FILE}`)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(FILE)

  // 1. Lectura y validación (sin red)
  const foodsRes = parseFoods(sheetRows(wb, 'Alimentos'))
  const recipesRes = parseRecipes(sheetRows(wb, 'Recetas'))
  const menuRows = sheetRows(wb, 'Datos_Menu')
  const weeks = menuRows
    .slice(1)
    .map((r) => cleanName(r[0]))
    .filter(Boolean)
  const years = resolveWeekYears(weeks, todayISO(), YEAR)
  if (!years.ok) {
    console.error(`\nNo se puede deducir el año: ${years.reason}.`)
    if (years.candidates.length) console.error(`Candidatos: ${years.candidates.join(', ')}.`)
    console.error('Vuelve a ejecutarlo con --year=AAAA (año de la primera semana).')
    process.exit(2)
  }
  const foodKeys = new Set(foodsRes.foods.map((f) => nameKey(f.name)))
  const recipeKeys = new Set(recipesRes.recipes.map((r) => nameKey(r.name)))
  const menu = parseMenu(menuRows, years.starts, foodKeys, recipeKeys)
  const ingredientMissing = recipesRes.recipes.flatMap((r) =>
    r.items.filter((i) => !foodKeys.has(nameKey(i.food))).map((i) => `${i.food} (receta "${r.name}")`),
  )
  const mealItems = menu.meals.reduce((a, m) => a + m.items.length, 0)
  const weekList = [...years.starts.entries()]

  console.log(`\nInforme de importación — ${FILE}${DRY ? '  [SIMULACIÓN: no se escribe nada]' : ''}`)
  console.log('─'.repeat(64))
  console.log(
    `Semanas: ${weekList.length} (${weekList[0]?.[1]} → ${weekList.at(-1)?.[1]}), año deducido ${years.firstYear}${YEAR ? ' (forzado)' : ''}`,
  )
  console.log(`Alimentos:  ${foodsRes.foods.length} a importar, ${foodsRes.skipped.length} omitidos`)
  console.log(
    `Recetas:    ${recipesRes.recipes.length} a importar (${recipesRes.recipes.reduce((a, r) => a + r.items.length, 0)} ingredientes)`,
  )
  console.log(
    `Comidas:    ${menu.meals.length} con datos (${mealItems} líneas), ${menu.empty} vacías omitidas, ${menu.skipped.length} líneas omitidas`,
  )
  console.log(`Hoja Resumen_Semanal: no se importa (se recalcula en la app)`)
  printSkips('Omitidos', [...foodsRes.skipped, ...recipesRes.skipped, ...menu.skipped])
  if (years.warnings.length) {
    console.log(`\nAvisos de fechas (${years.warnings.length}):`)
    years.warnings.forEach((w) => console.log(`  · ${w}`))
  }
  const unmatched = [...menu.unmatched.entries()].map(([n, c]) => `${n} (×${c})`).concat(ingredientMissing)
  console.log(`\nAlimentos sin coincidencia: ${unmatched.length ? unmatched.join(', ') : 'ninguno'}`)

  if (DRY) return

  // 2. Escritura
  try {
    loadEnvFile('.env.local')
  } catch {
    /* sin .env.local: se usan las variables del entorno */
  }
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const userId = process.env.IMPORT_USER_ID
  if (!url || !key || !userId) {
    console.error(
      '\nPara escribir faltan variables en .env.local: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e IMPORT_USER_ID.',
    )
    process.exit(1)
  }
  const db = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const check = <T>(res: { data: T; error: { message: string } | null }, what: string): NonNullable<T> => {
    if (res.error) throw new Error(`${what}: ${res.error.message}`)
    if (res.data === null || res.data === undefined) throw new Error(`${what}: sin datos`)
    return res.data
  }

  // Alimentos: actualiza los existentes (por nombre normalizado) e inserta los nuevos
  const existingFoods = check(
    await db.from('foods').select('id, name').eq('user_id', userId),
    'Leer alimentos',
  )
  const foodId = new Map(existingFoods.map((f) => [nameKey(f.name), f.id]))
  const foodRows = foodsRes.foods.map(({ name, kcal, protein, carbs, fat, fiber }) => ({
    ...(foodId.has(nameKey(name)) ? { id: foodId.get(nameKey(name)) } : {}),
    user_id: userId,
    name,
    kcal,
    protein,
    carbs,
    fat,
    fiber,
  }))
  const toUpdate = foodRows.filter((r) => r.id)
  const toInsert = foodRows.filter((r) => !r.id)
  const upFoods = [
    ...(toUpdate.length
      ? check(await db.from('foods').upsert(toUpdate).select('id, name'), 'Actualizar alimentos')
      : []),
    ...(toInsert.length
      ? check(await db.from('foods').insert(toInsert).select('id, name'), 'Insertar alimentos')
      : []),
  ]
  upFoods.forEach((f) => foodId.set(nameKey(f.name), f.id))

  // Recetas: igual; sus ingredientes se sustituyen
  const existingRecipes = check(
    await db.from('recipes').select('id, name').eq('user_id', userId),
    'Leer recetas',
  )
  const recipeId = new Map(existingRecipes.map((r) => [nameKey(r.name), r.id]))
  for (const r of recipesRes.recipes) {
    const id = recipeId.get(nameKey(r.name))
    const saved = check(
      await db
        .from('recipes')
        .upsert({ ...(id ? { id } : {}), user_id: userId, name: r.name, notes: r.notes })
        .select('id')
        .single(),
      `Receta ${r.name}`,
    )
    recipeId.set(nameKey(r.name), saved.id)
    const delRes = await db.from('recipe_items').delete().eq('recipe_id', saved.id)
    if (delRes.error) throw new Error(`Borrar ingredientes: ${delRes.error.message}`)
    const items = r.items
      .filter((i) => foodId.has(nameKey(i.food)))
      .map((i, position) => ({
        user_id: userId,
        recipe_id: saved.id,
        food_id: foodId.get(nameKey(i.food))!,
        grams: i.grams,
        position,
      }))
    if (items.length) {
      const ins = await db.from('recipe_items').insert(items)
      if (ins.error) throw new Error(`Ingredientes de ${r.name}: ${ins.error.message}`)
    }
  }

  // Comidas: upsert por (usuario, fecha, momento) y sustitución de sus líneas
  let written = 0
  for (const m of menu.meals) {
    const meal = check(
      await db
        .from('meals')
        .upsert({ user_id: userId, date: m.date, slot: m.slot }, { onConflict: 'user_id,date,slot' })
        .select('id')
        .single(),
      `Comida ${m.date} ${m.slot}`,
    )
    const delItems = await db.from('meal_items').delete().eq('meal_id', meal.id)
    if (delItems.error) throw new Error(`Borrar líneas: ${delItems.error.message}`)
    const items = m.items.map((it, position) => ({
      user_id: userId,
      meal_id: meal.id,
      food_id: it.kind === 'food' ? foodId.get(nameKey(it.name))! : null,
      recipe_id: it.kind === 'recipe' ? recipeId.get(nameKey(it.name))! : null,
      grams: it.grams,
      position,
    }))
    const insItems = await db.from('meal_items').insert(items)
    if (insItems.error) throw new Error(`Líneas ${m.date} ${m.slot}: ${insItems.error.message}`)
    written += items.length
  }

  console.log(
    `\nEscrito: ${upFoods.length} alimentos, ${recipesRes.recipes.length} recetas, ${menu.meals.length} comidas (${written} líneas).`,
  )
}

main().catch((e: unknown) => {
  console.error(`\nError: ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})
