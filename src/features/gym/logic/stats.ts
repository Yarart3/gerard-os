import { weekStart } from '../../../lib/dates'
import type { ExerciseUnit, SetValues } from './types'

export type HistSet = SetValues & { done: boolean }
export type HistItem = { exercise_id: string; sets: HistSet[] }
export type HistWorkout = {
  id: string
  date: string
  duration_min: number | null
  met_kcal: number | null
  watch_kcal: number | null
  items: HistItem[]
}

/** Volumen de una serie hecha (kg × repes). */
export const setVolume = (s: HistSet) => (s.done ? (s.weight_kg ?? 0) * (s.reps ?? 0) : 0)

export const workoutVolume = (w: HistWorkout) =>
  w.items.reduce((acc, it) => acc + it.sets.reduce((a, s) => a + setVolume(s), 0), 0)

/** kcal de la sesión: el dato del Apple Watch si existe; si no, la estimación MET. */
export const workoutKcal = (w: Pick<HistWorkout, 'met_kcal' | 'watch_kcal'>) =>
  w.watch_kcal ?? w.met_kcal ?? 0

/** 1RM estimado (Epley). */
export const e1rm = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30))

/** Valor principal de una serie según la unidad del ejercicio (para PRs y gráficas). */
export function setMetric(unit: ExerciseUnit, s: SetValues): number | null {
  switch (unit) {
    case 'kg':
      return s.weight_kg
    case 'reps':
      return s.reps
    case 'time':
      return s.seconds
    case 'meters':
      return s.meters
    case 'calories':
      return s.calories
  }
}

export type ProgressPoint = { date: string; value: number; e1rm?: number }

/** Mejor valor por sesión de un ejercicio, en orden cronológico (solo series hechas). */
export function progression(
  workouts: HistWorkout[],
  exerciseId: string,
  unit: ExerciseUnit,
): ProgressPoint[] {
  const points: ProgressPoint[] = []
  for (const w of [...workouts].sort((a, b) => a.date.localeCompare(b.date))) {
    let best: number | null = null
    let bestE1rm: number | null = null
    for (const it of w.items) {
      if (it.exercise_id !== exerciseId) continue
      for (const s of it.sets) {
        if (!s.done) continue
        const v = setMetric(unit, s)
        if (v !== null && (best === null || v > best)) best = v
        if (unit === 'kg' && s.weight_kg && s.reps) {
          const e = e1rm(s.weight_kg, s.reps)
          if (bestE1rm === null || e > bestE1rm) bestE1rm = e
        }
      }
    }
    if (best !== null)
      points.push(
        bestE1rm !== null ? { date: w.date, value: best, e1rm: bestE1rm } : { date: w.date, value: best },
      )
  }
  return points
}

export type PersonalRecord = {
  exercise_id: string
  value: number // mejor valor según la unidad
  reps: number | null // repes de la serie del récord (unidad kg)
  e1rm: number | null
  date: string
}

/** Récord personal de cada ejercicio (máximo del valor principal; en kg desempata por repes). */
export function personalRecords(
  workouts: HistWorkout[],
  unitOf: (exerciseId: string) => ExerciseUnit | undefined,
): Map<string, PersonalRecord> {
  const prs = new Map<string, PersonalRecord>()
  for (const w of workouts) {
    for (const it of w.items) {
      const unit = unitOf(it.exercise_id)
      if (!unit) continue
      for (const s of it.sets) {
        if (!s.done) continue
        const v = setMetric(unit, s)
        if (v === null || v <= 0) continue
        const cur = prs.get(it.exercise_id)
        const reps = unit === 'kg' ? s.reps : null
        const better = !cur || v > cur.value || (v === cur.value && (reps ?? 0) > (cur.reps ?? 0))
        const est = unit === 'kg' && s.weight_kg && s.reps ? e1rm(s.weight_kg, s.reps) : null
        if (better) {
          prs.set(it.exercise_id, {
            exercise_id: it.exercise_id,
            value: v,
            reps,
            e1rm: Math.max(est ?? 0, cur?.e1rm ?? 0) || null,
            date: w.date,
          })
        } else if (cur && est && est > (cur.e1rm ?? 0)) {
          cur.e1rm = est
        }
      }
    }
  }
  return prs
}

export type WeekSummary = { week: string; sessions: number; volume: number; kcal: number }

/** Resumen por semana (lunes a domingo), de la más reciente a la más antigua. */
export function weeklySummary(workouts: HistWorkout[]): WeekSummary[] {
  const map = new Map<string, WeekSummary>()
  for (const w of workouts) {
    const week = weekStart(w.date)
    const cur = map.get(week) ?? { week, sessions: 0, volume: 0, kcal: 0 }
    cur.sessions += 1
    cur.volume += workoutVolume(w)
    cur.kcal += workoutKcal(w)
    map.set(week, cur)
  }
  return [...map.values()].sort((a, b) => b.week.localeCompare(a.week))
}
