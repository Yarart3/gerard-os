import { daysUntil } from '../../agenda/logic/uni'

type DeadlineLike = { id: string; due_at: string; done: boolean }

/** Entregas pendientes de hoy en adelante, la más próxima primero (máx. `limit`). */
export function upcomingDeadlines<T extends DeadlineLike>(rows: readonly T[], today: string, limit = 4): T[] {
  return rows
    .filter((d) => !d.done && daysUntil(d.due_at, today) >= 0)
    .sort((a, b) => a.due_at.localeCompare(b.due_at))
    .slice(0, limit)
}
