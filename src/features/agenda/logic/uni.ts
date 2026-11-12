// Lógica de la Uni: media ponderada por ECTS (0–10) y cuenta atrás de entregas.
import { addDays } from '../../../lib/dates'
import { formatNumber } from '../../../lib/format'
import { localDateISO } from '../../../../supabase/functions/_shared/time.ts'

export type GradedSubject = { grade: number | null; ects: number | null }

/** Media ponderada por ECTS de las asignaturas con nota y créditos. `null` si no hay ninguna. */
export function weightedAverage(subjects: readonly GradedSubject[]): {
  average: number | null
  gradedEcts: number
  totalEcts: number
} {
  let sum = 0
  let gradedEcts = 0
  let totalEcts = 0
  for (const s of subjects) {
    const e = s.ects ?? 0
    totalEcts += e
    if (s.grade === null || e <= 0) continue
    sum += s.grade * e
    gradedEcts += e
  }
  return { average: gradedEcts > 0 ? sum / gradedEcts : null, gradedEcts, totalEcts }
}

/** Días naturales (Europe/Madrid) desde `today` hasta la fecha de `dueAt`: negativo si ya pasó. */
export function daysUntil(dueAt: string, today: string): number {
  const due = localDateISO(Date.parse(dueAt))
  return Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
}

export type Countdown = { days: number; label: string; tone: 'default' | 'accent' | 'orange' | 'green' }

/** Texto y tono de la cuenta atrás. `alertDays`: desde cuántos días antes se resalta en naranja. */
export function countdown(dueAt: string, today: string, opts: { done?: boolean; alertDays?: number } = {}): Countdown {
  const days = daysUntil(dueAt, today)
  if (opts.done) return { days, label: 'Hecha', tone: 'green' }
  const alert = opts.alertDays ?? 3
  const label =
    days === 0
      ? 'Hoy'
      : days === 1
        ? 'Mañana'
        : days > 1
          ? `En ${formatNumber(days, 0)} días`
          : days === -1
            ? 'Ayer'
            : `Hace ${formatNumber(-days, 0)} días`
  return { days, label, tone: days < 0 ? 'default' : days <= alert ? 'orange' : 'accent' }
}

/** Progreso medio (0–1) de los hitos del TFG. */
export function tfgProgress(milestones: readonly { progress: number }[]): number {
  if (!milestones.length) return 0
  return milestones.reduce((a, m) => a + m.progress, 0) / milestones.length / 100
}

export const tomorrow = (iso: string) => addDays(iso, 1)
