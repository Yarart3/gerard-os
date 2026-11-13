import { normalize } from './wodMatch'
import type { SetValues } from './types'

// Ejercicios en los que se mueve el propio cuerpo (sin acentos; en singular o en plural).
const KEYWORDS = [
  'dominada',
  'pull up',
  'pullup',
  'chin up',
  'chinup',
  'chest to bar',
  'c2b',
  'muscle up',
  'fondo',
  'dip',
  'flexion',
  'flexiones',
  'push up',
  'pushup',
  'handstand push up',
  'hspu',
  'pistol',
  'remo invertido',
  'inverted row',
  'ring row',
]

/** ¿El nombre o algún alias es de un ejercicio con peso corporal? */
export function looksBodyweight(name: string, aliases: readonly string[] = []): boolean {
  return [name, ...aliases].some((n) => {
    const plain = normalize(n)
    // también sin la «s» final de cada palabra: "pull ups" → "pull up", "fondos" → "fondo"
    const sing = plain.replace(/([a-zñ]{2,})s(?= |$)/g, '$1')
    const forms = [` ${plain} `, ` ${sing} `]
    return KEYWORDS.some((k) => forms.some((f) => f.includes(` ${k} `)))
  })
}

type Ex = { name: string; aliases?: string[]; unit: string; bodyweight?: boolean | null }

/** Peso corporal efectivo: lo elegido a mano o, si es automático, lo deducido del nombre. Solo con peso o repes. */
export const usesBodyweight = (ex: Ex | undefined): boolean =>
  !!ex && (ex.unit === 'kg' || ex.unit === 'reps') && (ex.bodyweight ?? looksBodyweight(ex.name, ex.aliases))

/** Carga total = peso corporal + lastre (null si no se sabe el peso corporal). */
export const bodyweightTotal = (bw: number | null, added: number | null): number | null =>
  bw === null ? null : Math.max(0, Math.round((bw + (added ?? 0)) * 100) / 100)

/** Serie de peso corporal con el peso de hoy (conserva el lastre de la serie copiada). */
export const withBodyweight = <T extends SetValues>(s: T, bw: number | null): T => {
  const added = s.added_kg ?? 0
  return { ...s, added_kg: added, weight_kg: bodyweightTotal(bw, added) }
}
