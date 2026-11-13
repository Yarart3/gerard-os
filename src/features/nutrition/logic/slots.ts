import { TIME_ZONE } from '../../../lib/format'

/** Comida que toca según la hora (con las comidas configuradas: 1.ª mañana, 2.ª mediodía…). */
export function suggestedSlot(slots: readonly string[], now: Date = new Date()): string | undefined {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', hourCycle: 'h23' }).format(now))
  if (!slots.length) return undefined
  if (slots.length < 4) return slots[Math.min(slots.length - 1, h < 12 ? 0 : h < 18 ? 1 : 2)]
  const i = h < 11 ? 0 : h < 16 ? 1 : h < 20 ? 2 : 3
  return slots[Math.min(i, slots.length - 1)]
}
