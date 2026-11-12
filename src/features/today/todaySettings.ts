import { DEFAULT_CUTOFF_MIN, parseCutoff } from '../../lib/dates'
import { useSectionSettings } from '../settings/useSettings'
import { DEFAULT_CARDS, normalizeCards, type CardPref } from './logic/cards'

export type TodaySettings = {
  cards: CardPref[] // orden y visibilidad
  cutoff: string // "HH:MM": hasta esa hora el día sigue siendo el anterior
}

export const DEFAULT_CUTOFF = '04:00'
export const TODAY_DEFAULTS: TodaySettings = { cards: DEFAULT_CARDS, cutoff: DEFAULT_CUTOFF }

export function useTodaySettings() {
  const s = useSectionSettings<TodaySettings>('today', TODAY_DEFAULTS)
  const cutoff = parseCutoff(s.value.cutoff) === null ? DEFAULT_CUTOFF : s.value.cutoff
  return { ...s, value: { cards: normalizeCards(s.value.cards), cutoff } }
}

export const cutoffMinutes = (hhmm: string) => parseCutoff(hhmm) ?? DEFAULT_CUTOFF_MIN
