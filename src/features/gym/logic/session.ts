import { TIME_ZONE } from '../../../lib/format'

/** Título por defecto según la hora de Madrid: «Entreno de mañana / tarde / noche». */
export function defaultTitle(now: Date = new Date()): string {
  const h = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', hourCycle: 'h23' }).format(now),
  )
  return h >= 5 && h < 14 ? 'Entreno de mañana' : h >= 14 && h < 21 ? 'Entreno de tarde' : 'Entreno de noche'
}

/** Minutos transcurridos desde el inicio (redondeados, mínimo 1). */
export function elapsedMinutes(startedAt: string | null, now: number = Date.now()): number | null {
  if (!startedAt) return null
  const ms = now - new Date(startedAt).getTime()
  return Number.isFinite(ms) ? Math.max(1, Math.round(ms / 60_000)) : null
}

/** Cronómetro "m:ss" o "h:mm:ss" desde el inicio. */
export function formatElapsed(startedAt: string | null, now: number = Date.now()): string {
  if (!startedAt) return '0:00'
  const total = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

type S = { done: boolean; weight_kg: number | null; reps: number | null }

/** Series hechas, totales y volumen (kg × repes de las hechas). */
export function sessionStats(items: readonly { sets: readonly S[] }[]) {
  let done = 0
  let total = 0
  let volume = 0
  for (const it of items)
    for (const s of it.sets) {
      total++
      if (!s.done) continue
      done++
      volume += (s.weight_kg ?? 0) * (s.reps ?? 0)
    }
  return { done, total, volume }
}
