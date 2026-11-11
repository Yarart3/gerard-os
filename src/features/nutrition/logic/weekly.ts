import { addMacros, ZERO, type Macros } from './macros'

export type WeekTable = {
  cell: (day: string, slot: string) => number // kcal
  dayTotals: Map<string, Macros>
  slotTotals: Map<string, number> // kcal
  total: Macros
  daysWithData: number
}

/** Totales de la semana por comida y por día (sustituye a la hoja Resumen_Semanal). */
export function weekTable<I>(
  meals: readonly { date: string; slot: string; items: readonly I[] }[],
  days: readonly string[],
  macrosOf: (item: I) => Macros,
): WeekTable {
  const cells = new Map<string, number>()
  const dayTotals = new Map<string, Macros>(days.map((d) => [d, ZERO]))
  const slotTotals = new Map<string, number>()
  let total = ZERO
  for (const m of meals) {
    if (!dayTotals.has(m.date)) continue
    for (const it of m.items) {
      const mm = macrosOf(it)
      const key = `${m.date}|${m.slot}`
      cells.set(key, (cells.get(key) ?? 0) + mm.kcal)
      dayTotals.set(m.date, addMacros(dayTotals.get(m.date) ?? ZERO, mm))
      slotTotals.set(m.slot, (slotTotals.get(m.slot) ?? 0) + mm.kcal)
      total = addMacros(total, mm)
    }
  }
  const daysWithData = [...dayTotals.values()].filter((t) => t.kcal > 0).length
  return { cell: (d, s) => cells.get(`${d}|${s}`) ?? 0, dayTotals, slotTotals, total, daysWithData }
}
