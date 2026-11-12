import { addDays } from '../../../lib/dates'

// Cajas de Leitner: repaso a 1, 3, 7 y 16 días. Un fallo devuelve la tarjeta a la caja 1.
export type Box = 1 | 2 | 3 | 4
export const BOX_DAYS: Record<Box, number> = { 1: 1, 2: 3, 3: 7, 4: 16 }

export type LeitnerCard = { box: number; due_on: string }

const clampBox = (n: number): Box => (n >= 4 ? 4 : n <= 1 ? 1 : (n as Box))

/** Nuevo estado de la tarjeta tras repasarla `today` (YYYY-MM-DD). */
export function reviewCard(card: { box: number }, correct: boolean, today: string): { box: Box; due_on: string } {
  const box = correct ? clampBox(card.box + 1) : 1
  return { box, due_on: addDays(today, BOX_DAYS[box]) }
}

export const isDue = (card: LeitnerCard, today: string) => card.due_on <= today

export function boxCounts(cards: { box: number }[]): Record<Box, number> {
  const out: Record<Box, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  for (const c of cards) out[clampBox(c.box)]++
  return out
}
