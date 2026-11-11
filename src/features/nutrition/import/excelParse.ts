// Lógica pura de la importación del Excel "Tracker GYM.xlsx" (CLAUDE.md §11).
// Sin dependencias del navegador ni de Supabase: la usan el script y los tests.
import { addDays, isoWeekday } from '../../../lib/dates'
import type { Macros } from '../logic/macros'

export type Cell = unknown
export type Row = Cell[] // índice 0 = columna A

/** Valor plano de una celda de exceljs (fórmulas → resultado, texto enriquecido → texto). */
export function plain(v: Cell): string | number | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number' || typeof v === 'string') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    if ('result' in o) return plain(o.result)
    if (Array.isArray(o.richText)) return o.richText.map((r: { text?: string }) => r.text ?? '').join('')
    if (typeof o.text === 'string') return o.text
    if ('error' in o) return null
  }
  return null
}

/** Texto limpio: sin espacios sobrantes. */
export function cleanName(v: Cell): string {
  const p = plain(v)
  return p === null ? '' : String(p).replace(/\s+/g, ' ').trim()
}

/** Número de una celda; acepta decimales con coma escritos como texto ("0,5"). */
export function toNumber(v: Cell): number | null {
  const p = plain(v)
  if (p === null) return null
  if (typeof p === 'number') return Number.isFinite(p) ? p : null
  const s = p.trim().replace(/\s/g, '').replace(',', '.')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Clave de comparación de nombres: sin mayúsculas, acentos ni espacios extra. */
export const nameKey = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

export type Skip = { sheet: string; row: number; reason: string }

// ---------- Alimentos ----------
export type ParsedFood = Macros & { name: string; row: number }

export function parseFoods(rows: Row[], sheet = 'Alimentos') {
  const foods: ParsedFood[] = []
  const skipped: Skip[] = []
  const seen = new Map<string, ParsedFood>()
  rows.forEach((r, i) => {
    const row = i + 1
    if (row === 1) return // cabecera
    const name = cleanName(r[0])
    if (!name) return
    const [kcal, protein, carbs, fat, fiber] = [1, 2, 3, 4, 5].map((c) => toNumber(r[c]))
    if (kcal === null && protein === null && carbs === null && fat === null) {
      skipped.push({ sheet, row, reason: `"${name}" no tiene macros` })
      return
    }
    const food: ParsedFood = {
      name,
      row,
      kcal: kcal ?? 0,
      protein: protein ?? 0,
      carbs: carbs ?? 0,
      fat: fat ?? 0,
      fiber: fiber ?? 0,
    }
    const prev = seen.get(nameKey(name))
    if (prev) {
      skipped.push({ sheet, row, reason: `"${name}" repetido (fila ${prev.row})` })
      return
    }
    seen.set(nameKey(name), food)
    foods.push(food)
  })
  return { foods, skipped }
}

// ---------- Recetas ----------
export type ParsedRecipe = {
  name: string
  notes: string | null
  items: { food: string; grams: number }[]
  row: number
}

const HEADER_RECIPE = 'nombre de la receta'
const FIRST_PAIR_COL = 8 // columna I: Alimento 1 / Cantidad 1, K/L, M/N…

/** Filas de ayuda del libro ("Nota: …", "Para insertar…") que no son recetas. */
const isHelpRow = (text: string) => /^(nota\b|para insertar|consulta\b)/i.test(text) || text.length > 80

export function parseRecipes(rows: Row[], sheet = 'Recetas') {
  const recipes: ParsedRecipe[] = []
  const skipped: Skip[] = []
  const header = rows.findIndex((r) => nameKey(cleanName(r[0])) === HEADER_RECIPE)
  if (header < 0) return { recipes, skipped: [{ sheet, row: 0, reason: 'No se encuentra la cabecera' }] }
  for (let i = header + 1; i < rows.length; i++) {
    const r = rows[i] ?? []
    const row = i + 1
    const name = cleanName(r[0])
    if (!name) continue
    if (isHelpRow(name)) {
      skipped.push({ sheet, row, reason: 'Nota de ayuda' })
      continue
    }
    const items: ParsedRecipe['items'] = []
    for (let c = FIRST_PAIR_COL; c < Math.max(r.length, FIRST_PAIR_COL + 2); c += 2) {
      const food = cleanName(r[c])
      const grams = toNumber(r[c + 1])
      if (!food && grams === null) continue
      if (!food || grams === null || grams <= 0) {
        skipped.push({
          sheet,
          row,
          reason: `Ingrediente incompleto en "${name}" (${food || 'sin alimento'})`,
        })
        continue
      }
      items.push({ food, grams })
    }
    const notes = cleanName(r[2]) || null
    if (!items.length)
      skipped.push({
        sheet,
        row,
        reason: `"${name}" no tiene ingredientes con gramos (se importa sin ellos)`,
      })
    recipes.push({ name, notes, items, row })
  }
  return { recipes, skipped }
}

// ---------- Datos_Menu: fechas ----------
export const DAY_INDEX: Record<string, number> = {
  lunes: 0,
  martes: 1,
  miercoles: 2,
  jueves: 3,
  viernes: 4,
  sabado: 5,
  domingo: 6,
}

export type WeekRange = { startDay: number; startMonth: number; endDay: number; endMonth: number }

/** "03/08 - 09/08" → días y meses (sin año). */
export function parseWeekRange(text: string): WeekRange | null {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\s*[-–]\s*(\d{1,2})\/(\d{1,2})\s*$/.exec(text)
  if (!m) return null
  const [startDay, startMonth, endDay, endMonth] = m.slice(1).map(Number) as [number, number, number, number]
  if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12) return null
  return { startDay, startMonth, endDay, endMonth }
}

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

export type YearResolution =
  | { ok: true; starts: Map<string, string>; firstYear: number; warnings: string[] }
  | { ok: false; reason: string; candidates: number[] }

/**
 * Deduce el año de cada semana. El libro empieza en agosto y no indica el año: se busca el año
 * (de los últimos 5, sin pasar de hoy) en que el primer día de la primera semana cae en lunes.
 * Las semanas siguientes avanzan de año al pasar de diciembre a enero.
 * Si no hay exactamente un candidato, no se adivina: devuelve los candidatos.
 */
export function resolveWeekYears(weeks: string[], today: string, forcedYear?: number): YearResolution {
  const ordered = [...new Set(weeks)]
  const first = ordered[0] ? parseWeekRange(ordered[0]) : null
  if (!first) return { ok: false, reason: `Semana no válida: "${ordered[0] ?? ''}"`, candidates: [] }

  let year: number
  if (forcedYear) {
    year = forcedYear
  } else {
    const thisYear = Number(today.slice(0, 4))
    const candidates: number[] = []
    for (let y = thisYear - 4; y <= thisYear; y++) {
      const d = iso(y, first.startMonth, first.startDay)
      if (isoWeekday(d) === 1 && d <= today) candidates.push(y)
    }
    if (candidates.length !== 1) {
      return {
        ok: false,
        reason:
          candidates.length === 0
            ? `Ningún año reciente tiene el ${ordered[0]} empezando en lunes`
            : `Varios años posibles para "${ordered[0]}"`,
        candidates,
      }
    }
    year = candidates[0]!
  }

  const starts = new Map<string, string>()
  const warnings: string[] = []
  let prevMonth = first.startMonth
  let expected: string | null = null
  for (const w of ordered) {
    const r = parseWeekRange(w)
    if (!r) {
      warnings.push(`Semana no válida: "${w}"`)
      continue
    }
    if (r.startMonth < prevMonth) year += 1
    prevMonth = r.startMonth
    const start = iso(year, r.startMonth, r.startDay)
    const end = addDays(start, 6)
    if (isoWeekday(start) !== 1) warnings.push(`"${w}": el ${start} no es lunes`)
    if (end.slice(5) !== `${String(r.endMonth).padStart(2, '0')}-${String(r.endDay).padStart(2, '0')}`)
      warnings.push(`"${w}": el final no cuadra con 7 días (${end})`)
    if (expected && start !== expected) warnings.push(`"${w}": se esperaba que empezara el ${expected}`)
    expected = addDays(start, 7)
    starts.set(w, start)
  }
  return { ok: true, starts, firstYear: Number(starts.values().next().value?.slice(0, 4)), warnings }
}

// ---------- Datos_Menu: comidas ----------
export type ParsedMealItem = { kind: 'food' | 'recipe'; name: string; grams: number }
export type ParsedMeal = { date: string; slot: string; items: ParsedMealItem[]; row: number }

export const MENU_COLUMNS = { week: 0, day: 1, slot: 2, firstFood: 3, pairs: 4 }

/**
 * Convierte las filas de Datos_Menu en comidas con fecha real.
 * Las comidas vacías se omiten; los alimentos que no están ni en Alimentos ni en Recetas se informan.
 */
export function parseMenu(
  rows: Row[],
  starts: ReadonlyMap<string, string>,
  foodNames: ReadonlySet<string>, // nameKey()
  recipeNames: ReadonlySet<string>, // nameKey()
  sheet = 'Datos_Menu',
) {
  const meals: ParsedMeal[] = []
  const skipped: Skip[] = []
  const unmatched = new Map<string, number>() // nombre → veces
  let empty = 0
  rows.forEach((r, i) => {
    const row = i + 1
    if (row === 1) return
    const week = cleanName(r[MENU_COLUMNS.week])
    const day = nameKey(cleanName(r[MENU_COLUMNS.day]))
    const slot = cleanName(r[MENU_COLUMNS.slot])
    if (!week && !day && !slot) return
    const start = starts.get(week)
    const offset = DAY_INDEX[day]
    if (!start || offset === undefined || !slot) {
      skipped.push({ sheet, row, reason: `Fila sin semana, día o momento válidos (${week} ${day} ${slot})` })
      return
    }
    const items: ParsedMealItem[] = []
    for (let k = 0; k < MENU_COLUMNS.pairs; k++) {
      const name = cleanName(r[MENU_COLUMNS.firstFood + k * 2])
      const grams = toNumber(r[MENU_COLUMNS.firstFood + k * 2 + 1])
      if (!name && grams === null) continue
      if (!name) {
        skipped.push({ sheet, row, reason: `Cantidad ${grams} g sin alimento` })
        continue
      }
      if (grams === null || grams <= 0) {
        skipped.push({ sheet, row, reason: `"${name}" sin cantidad` })
        continue
      }
      const key = nameKey(name)
      const kind = foodNames.has(key) ? 'food' : recipeNames.has(key) ? 'recipe' : null
      if (!kind) {
        unmatched.set(name, (unmatched.get(name) ?? 0) + 1)
        skipped.push({ sheet, row, reason: `"${name}" no está en Alimentos ni en Recetas` })
        continue
      }
      items.push({ kind, name, grams })
    }
    if (!items.length) {
      empty += 1
      return
    }
    meals.push({ date: addDays(start, offset), slot, items, row })
  })
  return { meals, skipped, unmatched, empty }
}
