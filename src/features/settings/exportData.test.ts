import { collectExport, EXPORT_TABLES, PAGE_SIZE, type FetchPage } from './exportData'

describe('collectExport', () => {
  it('incluye todas las tablas y pagina hasta agotar filas', async () => {
    const total = PAGE_SIZE + 5
    const calls: string[] = []
    const fetchPage: FetchPage = async (table, from, to) => {
      calls.push(`${table}:${from}-${to}`)
      if (table !== 'foods') return []
      return Array.from({ length: Math.max(0, Math.min(to, total - 1) - from + 1) }, (_, i) => ({
        i: from + i,
      }))
    }
    const out = await collectExport(fetchPage, new Date('2026-11-11T10:00:00Z'))
    expect(Object.keys(out.tables)).toEqual([...EXPORT_TABLES])
    expect(out.tables.foods).toHaveLength(total)
    expect(calls.filter((c) => c.startsWith('foods:'))).toEqual([
      `foods:0-${PAGE_SIZE - 1}`,
      `foods:${PAGE_SIZE}-${2 * PAGE_SIZE - 1}`,
    ])
    expect(out.exported_at).toBe('2026-11-11T10:00:00.000Z')
  })
})
