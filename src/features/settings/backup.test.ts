import {
  BACKUP_PAGE_SIZE,
  BACKUP_TABLES,
  buildBackup,
  fetchAllRows,
  secretsEqual,
} from '../../../supabase/functions/_shared/backup.ts'

const makeFetch = (counts: Record<string, number>) => {
  const calls: [string, number, number][] = []
  const fetchRows = async (table: string, from: number, to: number) => {
    calls.push([table, from, to])
    const total = counts[table] ?? 0
    const n = Math.max(0, Math.min(to + 1, total) - from)
    return Array.from({ length: n }, (_, i) => ({ id: from + i }))
  }
  return { fetchRows, calls }
}

describe('copia de seguridad', () => {
  it('pagina de 1000 en 1000 y junta todas las filas', async () => {
    const { fetchRows, calls } = makeFetch({ events: 2500 })
    const rows = await fetchAllRows('events', fetchRows)
    expect(rows).toHaveLength(2500)
    expect(calls).toEqual([
      ['events', 0, 999],
      ['events', 1000, 1999],
      ['events', 2000, 2999],
    ])
  })
  it('un múltiplo exacto de la página pide una página más (vacía) para confirmar el final', async () => {
    const { fetchRows, calls } = makeFetch({ events: BACKUP_PAGE_SIZE })
    expect(await fetchAllRows('events', fetchRows)).toHaveLength(BACKUP_PAGE_SIZE)
    expect(calls).toHaveLength(2)
  })
  it('tabla vacía: una sola petición', async () => {
    const { fetchRows, calls } = makeFetch({})
    expect(await fetchAllRows('notes', fetchRows)).toEqual([])
    expect(calls).toHaveLength(1)
  })
  it('el formato es { exported_at, tables } con todas las tablas y sin ai_cache', async () => {
    const { fetchRows } = makeFetch({ notes: 3, songs: 1 })
    const b = await buildBackup(fetchRows, new Date('2026-11-15T03:00:00Z'))
    expect(Object.keys(b).sort()).toEqual(['exported_at', 'tables'])
    expect(b.exported_at).toBe('2026-11-15T03:00:00.000Z')
    expect(Object.keys(b.tables)).toEqual([...BACKUP_TABLES])
    expect(b.tables.notes).toHaveLength(3)
    expect(b.tables).not.toHaveProperty('ai_cache')
    expect(b.tables).toHaveProperty('songs')
  })
  it('propaga los errores de lectura', async () => {
    await expect(buildBackup(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
  })
  it('compara secretos en tiempo constante (iguales / distintos / longitudes distintas)', async () => {
    expect(await secretsEqual('abc', 'abc')).toBe(true)
    expect(await secretsEqual('abc', 'abd')).toBe(false)
    expect(await secretsEqual('abc', 'abcd')).toBe(false)
    expect(await secretsEqual('', 'abc')).toBe(false)
  })
})
