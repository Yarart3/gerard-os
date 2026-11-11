import { normalize } from './wodMatch'

/** Coincide por nombre o alias, sin mayúsculas ni acentos. */
export const matchesQuery = (e: { name: string; aliases?: string[] }, q: string) => {
  const nq = normalize(q)
  return !nq || [e.name, ...(e.aliases ?? [])].some((n) => normalize(n).includes(nq))
}

/** "Wall ball, WB ,  wallball" → ["Wall ball", "WB", "wallball"] */
export const parseAliases = (text: string) => [
  ...new Set(
    text
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean),
  ),
]
