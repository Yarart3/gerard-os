import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import { fail } from './errors'

// Cliente sin tipos de tablas: los helpers de la cola son genéricos (las filas ya vienen tipadas en cada módulo).
const db = supabase as unknown as SupabaseClient

type Row = Record<string, unknown> & { id: string }

/** Inserta una fila con ID del cliente; si ya existe (reintento) no hace nada. Idempotente. */
export async function insertOnce(table: string, rows: Row | Row[]) {
  const list = Array.isArray(rows) ? rows : [rows]
  if (!list.length) return
  fail((await db.from(table).upsert(list, { onConflict: 'id', ignoreDuplicates: true })).error)
}

/** Cambia columnas de una fila. Idempotente por naturaleza. */
export async function updateRow(table: string, id: string, patch: Record<string, unknown>) {
  fail((await db.from(table).update(patch).eq('id', id)).error)
}

/** Borra una fila. Si ya no existe, no es un error. */
export async function deleteRow(table: string, id: string) {
  fail((await db.from(table).delete().eq('id', id)).error)
}

/** Alta (con ID del cliente, ignorando duplicados) o edición (UPDATE parcial) según `isNew`. */
export async function saveRow(table: string, isNew: boolean, row: Row) {
  if (isNew) await insertOnce(table, row)
  else {
    const { id, ...patch } = row
    await updateRow(table, id, patch)
  }
}

export { db }
