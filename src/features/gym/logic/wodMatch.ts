// Coincidencia del texto de un WOD (AimHarder, pegado a mano) con el catálogo.

/** Minúsculas, sin acentos, sin signos y con espacios simples. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

// Plural simple en inglés/castellano: "thrusters" → "thruster", "dominadas" → "dominada".
const singular = (w: string) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)
const canon = (text: string) => normalize(text).split(' ').map(singular).join(' ')

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min((prev[j] ?? 0) + 1, (cur[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost)
    }
    prev = cur
  }
  return prev[b.length] ?? 0
}

/** Similitud 0..1 entre dos nombres ya canonizados. */
export function similarity(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  const ratio = 1 - levenshtein(a, b) / Math.max(a.length, b.length)
  // Mismo conjunto de palabras en otro orden ("press banca" / "banca press")
  const ta = a.split(' ').sort().join(' ')
  const tb = b.split(' ').sort().join(' ')
  const sorted = ta === tb ? 0.95 : 0
  // Uno contiene al otro como palabras completas ("hang power clean" ⊃ "power clean")
  const contains = ` ${a} `.includes(` ${b} `) || ` ${b} `.includes(` ${a} `) ? 0.85 : 0
  return Math.max(ratio, sorted, contains)
}

// Cabeceras y palabras de formato que no son ejercicios.
const NOISE = new Set(
  [
    'amrap',
    'emom',
    'e2mom',
    'e3mom',
    'for',
    'time',
    'fortime',
    'rft',
    'round',
    'rounds',
    'ronda',
    'rondas',
    'of',
    'de',
    'x',
    'rx',
    'rx+',
    'scaled',
    'escalado',
    'tabata',
    'wod',
    'cap',
    'timecap',
    'min',
    'mins',
    'minute',
    'minutes',
    'minuto',
    'minutos',
    'sec',
    'secs',
    'seg',
    'segundos',
    'rest',
    'descanso',
    'every',
    'cada',
    'each',
    'cada',
    'then',
    'luego',
    'y',
    'and',
    'with',
    'con',
    'max',
    'reps',
    'rep',
    'repes',
    'set',
    'sets',
    'series',
    'serie',
    'kg',
    'lb',
    'lbs',
    'm',
    'km',
    'cal',
    'cals',
    'kcal',
    'warm',
    'up',
    'warmup',
    'calentamiento',
    'strength',
    'fuerza',
    'metcon',
    'skill',
    'tecnica',
    'buy',
    'in',
    'cash',
    'out',
    'a',
    'b',
    'c',
    'd',
    'e',
    'pm',
    'am',
    'total',
    'build',
    'to',
    'heavy',
    'unbroken',
    'alt',
    'alternate',
    'bloque',
    'parte',
    'part',
    'interval',
    'intervalos',
    'on',
    'off',
    'the',
    'el',
    'la',
    'los',
    'las',
  ].map((w) => w),
)

/** Quita cantidades, esquemas de repes, pesos y palabras de formato de una línea. */
export function cleanLine(line: string): string {
  const noParens = line.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
  const words = normalize(noParens)
    .split(' ')
    .filter((w) => w && !/^\d/.test(w) && !NOISE.has(w))
  return words.join(' ')
}

export type CatalogEntry = { id: string; name: string; aliases: string[] }

export type WodLineMatch<T extends CatalogEntry> = {
  line: string // texto original
  query: string // texto limpio usado para buscar
  match: T | null
  score: number
}

export const MATCH_THRESHOLD = 0.78

/** Mejor coincidencia de un texto con el catálogo (nombre o alias). */
export function bestMatch<T extends CatalogEntry>(query: string, catalog: readonly T[]) {
  const q = canon(query)
  let best: { item: T; score: number } | null = null
  for (const item of catalog) {
    for (const name of [item.name, ...item.aliases]) {
      const score = similarity(q, canon(name))
      if (!best || score > best.score) best = { item, score }
    }
  }
  return best
}

/** Analiza el WOD línea a línea. Las líneas sin ejercicio (cabeceras, tiempos…) se descartan. */
export function matchWod<T extends CatalogEntry>(text: string, catalog: readonly T[]): WodLineMatch<T>[] {
  const out: WodLineMatch<T>[] = []
  const seen = new Set<string>()
  for (const raw of text.split(/\r?\n|;|\+/)) {
    const line = raw.trim()
    const query = cleanLine(line)
    if (query.length < 2) continue
    const best = bestMatch(query, catalog)
    const ok = best && best.score >= MATCH_THRESHOLD ? best : null
    const key = ok ? `id:${ok.item.id}` : `q:${canon(query)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ line, query, match: ok?.item ?? null, score: ok?.score ?? best?.score ?? 0 })
  }
  return out
}

/** Nombre propuesto para crear un ejercicio nuevo a partir del texto limpio. */
export function suggestName(query: string): string {
  return query.replace(/\b\p{L}/gu, (c) => c.toUpperCase())
}
