// Tarjetas de Hoy: orden y visibilidad (lógica pura, sin React).
export const CARD_IDS = ['kcal', 'agenda', 'deadlines', 'workout', 'english', 'note', 'personal'] as const
export type CardId = (typeof CARD_IDS)[number]
export type CardPref = { id: CardId; visible: boolean }

export const CARD_LABEL: Record<CardId, string> = {
  kcal: 'Calorías',
  agenda: 'Agenda del día',
  deadlines: 'Próximas entregas',
  workout: 'Entreno de hoy',
  english: 'Inglés',
  note: 'Nota rápida',
  personal: 'Resumen de Personal',
}

export const DEFAULT_CARDS: CardPref[] = CARD_IDS.map((id) => ({ id, visible: true }))

const isCardId = (x: unknown): x is CardId => typeof x === 'string' && (CARD_IDS as readonly string[]).includes(x)

/** Lo guardado (puede estar incompleto o tener ids viejos) -> lista completa y sin duplicados.
 *  Las tarjetas nuevas que falten se añaden al final, visibles. */
export function normalizeCards(saved: unknown): CardPref[] {
  const out: CardPref[] = []
  const seen = new Set<CardId>()
  if (Array.isArray(saved)) {
    for (const raw of saved) {
      const r = raw as { id?: unknown; visible?: unknown } | null
      if (!r || !isCardId(r.id) || seen.has(r.id)) continue
      seen.add(r.id)
      out.push({ id: r.id, visible: r.visible !== false })
    }
  }
  for (const id of CARD_IDS) if (!seen.has(id)) out.push({ id, visible: true })
  return out
}

/** Sube (-1) o baja (+1) una tarjeta; los extremos no se mueven. */
export function moveCard(list: readonly CardPref[], id: CardId, dir: -1 | 1): CardPref[] {
  const i = list.findIndex((c) => c.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= list.length) return [...list]
  const next = [...list]
  ;[next[i], next[j]] = [next[j]!, next[i]!]
  return next
}

export const setCardVisible = (list: readonly CardPref[], id: CardId, visible: boolean): CardPref[] =>
  list.map((c) => (c.id === id ? { ...c, visible } : c))

/** Ids visibles, en orden. */
export const visibleCards = (list: readonly CardPref[]): CardId[] => list.filter((c) => c.visible).map((c) => c.id)
