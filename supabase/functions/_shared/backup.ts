// Lógica pura de la copia de seguridad (compartida entre la Edge Function `backup` y los tests).
// Sin imports ni globals de Deno.

/** Todas las tablas de datos del usuario (lista explícita; ai_cache se excluye: es caché regenerable). */
export const BACKUP_TABLES = [
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
  'ai_usage',
] as const

/** PostgREST devuelve como máximo 1000 filas por petición (`max_rows`). */
export const BACKUP_PAGE_SIZE = 1000

/** Lee las filas [from, to] (inclusive) de una tabla. */
export type FetchRows = (table: string, from: number, to: number) => Promise<unknown[]>

/** Pide páginas de `pageSize` hasta que llega una incompleta (o vacía). */
export async function fetchAllRows(
  table: string,
  fetchRows: FetchRows,
  pageSize: number = BACKUP_PAGE_SIZE,
): Promise<unknown[]> {
  const rows: unknown[] = []
  for (let from = 0; ; from += pageSize) {
    const page = await fetchRows(table, from, from + pageSize - 1)
    rows.push(...page)
    if (page.length < pageSize) return rows
  }
}

export type BackupFile = { exported_at: string; tables: Record<string, unknown[]> }

export async function buildBackup(
  fetchRows: FetchRows,
  now: Date = new Date(),
  tables: readonly string[] = BACKUP_TABLES,
  pageSize: number = BACKUP_PAGE_SIZE,
): Promise<BackupFile> {
  const out: Record<string, unknown[]> = {}
  for (const t of tables) out[t] = await fetchAllRows(t, fetchRows, pageSize)
  return { exported_at: now.toISOString(), tables: out }
}

/** Comparación en tiempo constante de dos secretos (se comparan sus SHA-256, de longitud fija). */
export async function secretsEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder()
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ])
  const x = new Uint8Array(ha)
  const y = new Uint8Array(hb)
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i]! ^ y[i]!
  return diff === 0
}
