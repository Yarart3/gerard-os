import { allTags, filterNotes, normalizeText, parseTags } from './notes'

const mk = (title: string, body: string, tags: string[], pinned = false, updated_at = '2026-11-01T10:00:00Z') => ({
  title,
  body,
  tags,
  pinned,
  updated_at,
})

describe('notas', () => {
  const notes = [
    mk('Lista de la compra', 'Plátanos y limones', ['casa']),
    mk('Reunión', 'Revisar presupuesto con Tomás', ['trabajo'], false, '2026-11-05T10:00:00Z'),
    mk('Café en Málaga', 'Probar el sitio de la calle Larios', ['viaje', 'ideas'], true, '2026-10-01T10:00:00Z'),
  ]

  it('busca sin distinguir mayúsculas ni acentos', () => {
    expect(normalizeText('MÁLAGA Cañón')).toBe('malaga canon')
    expect(filterNotes(notes, 'malaga', null).map((n) => n.title)).toEqual(['Café en Málaga'])
    expect(filterNotes(notes, 'TOMAS', null).map((n) => n.title)).toEqual(['Reunión'])
    expect(filterNotes(notes, 'reunion', null)).toHaveLength(1)
    expect(filterNotes(notes, 'IDEAS', null)).toHaveLength(1) // por etiqueta
  })

  it('filtra por etiqueta y pone las fijadas arriba', () => {
    expect(filterNotes(notes, '', 'trabajo')).toHaveLength(1)
    expect(filterNotes(notes, '', null).map((n) => n.title)).toEqual(['Café en Málaga', 'Reunión', 'Lista de la compra'])
  })

  it('normaliza etiquetas', () => {
    expect(parseTags('Ideas, #Viaje  ideas,, ')).toEqual(['ideas', 'viaje'])
    expect(allTags(notes, ['Extra'])).toEqual(['casa', 'extra', 'ideas', 'trabajo', 'viaje'])
  })
})
