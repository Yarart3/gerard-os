// Comparación palabra por palabra (alineación LCS) para los dictados.
export type DiffItem =
  | { type: 'ok'; word: string }
  | { type: 'wrong'; expected: string; got: string }
  | { type: 'missing'; expected: string }
  | { type: 'extra'; got: string }

/** Minúsculas, sin acentos/puntuación (se conserva el apóstrofo: don't). */
export function normalizeWord(w: string): string {
  return w
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9']/g, '')
}

export function words(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => normalizeWord(w) !== '')
}

export function diffWords(expectedText: string, answerText: string): DiffItem[] {
  const a = words(expectedText)
  const b = words(answerText)
  const na = a.map(normalizeWord)
  const nb = b.map(normalizeWord)
  const n = a.length
  const m = b.length
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      lcs[i]![j] = na[i] === nb[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!)

  const out: DiffItem[] = []
  let i = 0
  let j = 0
  let missing: string[] = []
  let extra: string[] = []
  const flush = () => {
    const pairs = Math.min(missing.length, extra.length)
    for (let k = 0; k < pairs; k++) out.push({ type: 'wrong', expected: missing[k]!, got: extra[k]! })
    for (const w of missing.slice(pairs)) out.push({ type: 'missing', expected: w })
    for (const w of extra.slice(pairs)) out.push({ type: 'extra', got: w })
    missing = []
    extra = []
  }
  while (i < n || j < m) {
    if (i < n && j < m && na[i] === nb[j]) {
      flush()
      out.push({ type: 'ok', word: a[i]! })
      i++
      j++
    } else if (j >= m || (i < n && lcs[i + 1]![j]! >= lcs[i]![j + 1]!)) {
      missing.push(a[i]!)
      i++
    } else {
      extra.push(b[j]!)
      j++
    }
  }
  flush()
  return out
}

/** Porcentaje de palabras esperadas acertadas (0–100). */
export function diffScore(items: DiffItem[]): number {
  const expected = items.filter((d) => d.type !== 'extra').length
  if (!expected) return 0
  return Math.round((items.filter((d) => d.type === 'ok').length / expected) * 100)
}

export const isPerfect = (items: DiffItem[]) => items.length > 0 && items.every((d) => d.type === 'ok')

const squash = (s: string) => normalizeWord(s.replace(/\s+/g, ''))
/** ¿Coincide lo escrito con el término? Ignora mayúsculas, acentos, puntuación y el "to" inicial de los verbos. */
export const sameTerm = (typed: string, term: string) =>
  squash(typed) === squash(term) || squash(typed.replace(/^to\s+/i, '')) === squash(term.replace(/^to\s+/i, ''))
