import { addDays, todayISO } from '../../../lib/dates'

// Puntos y racha diarios (fechas en Europe/Madrid vía todayISO).
export type DailyRow = { date: string; points: number; streak: number }

/** Puntos por actividad. */
export const POINTS = { vocab: 2, dictation: 10, order: 5, rephrase: 8, gaps: 1, idiom: 3, lesson: 15 } as const

/** Fila de `today` tras sumar `add` puntos. La racha crece si ayer hubo actividad; si no, vuelve a 1. */
export function applyPoints(rows: DailyRow[], today: string, add: number): DailyRow {
  const cur = rows.find((r) => r.date === today)
  if (cur) return { date: today, points: cur.points + add, streak: Math.max(1, cur.streak) }
  const prev = rows.find((r) => r.date === addDays(today, -1) && r.points > 0)
  return { date: today, points: add, streak: prev ? prev.streak + 1 : 1 }
}

/** Racha vigente: la de hoy, o la de ayer si hoy aún no se ha practicado; 0 si se rompió. */
export function currentStreak(rows: DailyRow[], today: string = todayISO()): number {
  const t = rows.find((r) => r.date === today && r.points > 0)
  if (t) return t.streak
  const y = rows.find((r) => r.date === addDays(today, -1) && r.points > 0)
  return y ? y.streak : 0
}

/** Puntos de los 7 días terminados en `today` (del más antiguo al más reciente). */
export function lastSevenDays(rows: DailyRow[], today: string = todayISO()) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6)
    return { date, points: rows.find((r) => r.date === date)?.points ?? 0 }
  })
}
