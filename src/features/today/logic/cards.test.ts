import { CARD_IDS, DEFAULT_CARDS, moveCard, normalizeCards, setCardVisible, visibleCards } from './cards'
import { upcomingDeadlines } from './upcoming'

describe('tarjetas de Hoy', () => {
  it('por defecto están todas, visibles y en el orden del catálogo', () => {
    expect(visibleCards(DEFAULT_CARDS)).toEqual([...CARD_IDS])
  })
  it('normaliza lo guardado: conserva el orden, descarta ids desconocidos y duplicados, y añade las que faltan', () => {
    const list = normalizeCards([
      { id: 'note', visible: true },
      { id: 'zzz', visible: true },
      { id: 'kcal', visible: false },
      { id: 'note', visible: false },
    ])
    expect(list.map((c) => c.id).slice(0, 2)).toEqual(['note', 'kcal'])
    expect(list).toHaveLength(CARD_IDS.length)
    expect(list.find((c) => c.id === 'kcal')?.visible).toBe(false)
    expect(list.find((c) => c.id === 'agenda')?.visible).toBe(true)
  })
  it('basura o vacío -> valores por defecto', () => {
    expect(normalizeCards(undefined)).toEqual(DEFAULT_CARDS)
    expect(normalizeCards('x')).toEqual(DEFAULT_CARDS)
  })
  it('sube y baja tarjetas sin salirse de los extremos', () => {
    const up = moveCard(DEFAULT_CARDS, 'agenda', -1)
    expect(up.map((c) => c.id).slice(0, 2)).toEqual(['agenda', 'kcal'])
    expect(moveCard(DEFAULT_CARDS, 'kcal', -1)).toEqual(DEFAULT_CARDS)
    const last = CARD_IDS[CARD_IDS.length - 1]!
    expect(moveCard(DEFAULT_CARDS, last, 1)).toEqual(DEFAULT_CARDS)
    expect(moveCard(DEFAULT_CARDS, 'kcal', 1)[1]?.id).toBe('kcal')
  })
  it('oculta tarjetas y visibleCards respeta orden y visibilidad', () => {
    let list = setCardVisible(DEFAULT_CARDS, 'agenda', false)
    list = moveCard(list, 'personal', -1)
    const ids = visibleCards(list)
    expect(ids).not.toContain('agenda')
    expect(ids.indexOf('personal')).toBeLessThan(ids.indexOf('note'))
  })
})

describe('próximas entregas', () => {
  const rows = [
    { id: 'a', due_at: '2026-11-20T10:00:00Z', done: false },
    { id: 'b', due_at: '2026-11-05T10:00:00Z', done: false }, // ya pasó
    { id: 'c', due_at: '2026-11-13T10:00:00Z', done: true }, // hecha
    { id: 'd', due_at: '2026-11-12T10:00:00Z', done: false }, // hoy
    { id: 'e', due_at: '2026-11-30T10:00:00Z', done: false },
  ]
  it('solo pendientes de hoy en adelante, ordenadas y limitadas', () => {
    expect(upcomingDeadlines(rows, '2026-11-12').map((d) => d.id)).toEqual(['d', 'a', 'e'])
    expect(upcomingDeadlines(rows, '2026-11-12', 2).map((d) => d.id)).toEqual(['d', 'a'])
  })
})
