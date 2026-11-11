import type { Database } from '../../lib/database.types'

export type TableName = keyof Database['public']['Tables']

/** Todas las tablas del usuario, en orden de dependencias (padres antes que hijos). */
export const EXPORT_TABLES = [
  'settings',
  'exercises',
  'workouts',
  'workout_items',
  'sets',
  'foods',
  'recipes',
  'recipe_items',
  'meals',
  'meal_items',
  'calendars',
  'events',
  'sync_state',
  'subjects',
  'deadlines',
  'tfg_milestones',
  'expense_categories',
  'expenses',
  'watchlist',
  'notes',
  'english_profile',
  'vocab_cards',
  'english_exercises',
  'english_attempts',
  'artists',
  'songs',
  'english_daily',
] as const satisfies readonly TableName[]

export const PAGE_SIZE = 1000

/** Lee una página [from, to] de una tabla. */
export type FetchPage = (table: TableName, from: number, to: number) => Promise<unknown[]>

export type ExportFile = {
  app: 'gerard-os'
  version: 1
  exported_at: string
  tables: Record<string, unknown[]>
}

/** Recorre todas las tablas paginando de 1000 en 1000 (límite por defecto de la API). */
export async function collectExport(fetchPage: FetchPage, now = new Date()): Promise<ExportFile> {
  const tables: Record<string, unknown[]> = {}
  for (const table of EXPORT_TABLES) {
    const rows: unknown[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
      const page = await fetchPage(table, from, from + PAGE_SIZE - 1)
      rows.push(...page)
      if (page.length < PAGE_SIZE) break
    }
    tables[table] = rows
  }
  return { app: 'gerard-os', version: 1, exported_at: now.toISOString(), tables }
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
