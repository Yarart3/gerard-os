export type NoteLike = { title: string; body: string; tags: string[]; pinned: boolean; updated_at: string }

/** Minúsculas y sin acentos, para buscar sin distinguir. */
export const normalizeText = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es-ES')

export const normalizeTag = (s: string) => s.trim().replace(/^#/, '').toLocaleLowerCase('es-ES')

/** Convierte "trabajo, ideas #viaje" en etiquetas únicas y limpias. */
export function parseTags(input: string): string[] {
  const out: string[] = []
  for (const part of input.split(/[,\s]+/)) {
    const t = normalizeTag(part)
    if (t && !out.includes(t)) out.push(t)
  }
  return out
}

/** Filtra por texto (título, cuerpo y etiquetas) y etiqueta; fijadas primero, luego las más recientes. */
export function filterNotes<T extends NoteLike>(notes: T[], query: string, tag: string | null): T[] {
  const q = normalizeText(query.trim())
  return notes
    .filter((n) => {
      if (tag && !n.tags.includes(tag)) return false
      if (!q) return true
      return normalizeText([n.title, n.body, ...n.tags].join('\n')).includes(q)
    })
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at))
}

export function allTags(notes: { tags: string[] }[], extra: string[] = []): string[] {
  return [...new Set([...extra.map(normalizeTag), ...notes.flatMap((n) => n.tags)])]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'es'))
}
