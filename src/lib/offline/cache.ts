import type { QueryClient, QueryKey } from '@tanstack/react-query'

/** Aplica `fn` a todas las listas en caché cuya clave empiece por `key` (las que no existen se ignoran). */
export function mapLists<T>(qc: QueryClient, key: QueryKey, fn: (list: T[], queryKey: QueryKey) => T[]) {
  for (const [queryKey, data] of qc.getQueriesData<T[]>({ queryKey: key })) {
    if (Array.isArray(data)) qc.setQueryData<T[]>(queryKey, fn(data, queryKey))
  }
}

type WithId = { id: string }

/** Inserta la fila o, si ya está, la fusiona con `patch`. */
export function upsertRow<T extends WithId>(list: T[], row: T, merge = true): T[] {
  const i = list.findIndex((x) => x.id === row.id)
  if (i < 0) return [...list, row]
  return list.map((x, j) => (j === i ? (merge ? { ...x, ...row } : row) : x))
}

export const removeRow = <T extends WithId>(list: T[], id: string): T[] => list.filter((x) => x.id !== id)

export const nowIso = () => new Date().toISOString()
