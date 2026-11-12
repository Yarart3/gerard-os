// Orden de palabras: tocar palabras desordenadas y comprobar contra varios órdenes aceptados.
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[.,;:!?"“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

export const tokenize = (sentence: string) => sentence.trim().split(/\s+/).filter(Boolean)

/** ¿La respuesta (lista de palabras) coincide con alguno de los órdenes aceptados? */
export function checkOrder(answer: string[], acceptedOrders: string[]): boolean {
  const a = norm(answer.join(' '))
  return a !== '' && acceptedOrders.some((o) => norm(o) === a)
}

function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

export function hashString(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Desordena de forma determinista; nunca devuelve el orden correcto (si hay >1 palabra distinta). */
export function shuffleWords(tokens: string[], seed: number): string[] {
  const rand = rng(seed)
  const original = tokens.join(' ')
  let out = tokens
  for (let attempt = 0; attempt < 8; attempt++) {
    out = [...tokens]
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[out[i], out[j]] = [out[j]!, out[i]!]
    }
    if (out.join(' ') !== original) return out
  }
  return out.length > 1 ? [...out.slice(1), out[0]!] : out
}
