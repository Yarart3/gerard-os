import { z } from 'zod'

// Esquemas Zod de las respuestas de la IA (se validan en el cliente; un fallo provoca UN reintento).
const str = z.string().trim().min(1)

export const rephraseItem = z.object({
  sentence: str,
  instruction: str,
  model_answers: z.array(str).min(1).max(4),
  rule: str,
})
export const rephraseBatchSchema = z.object({ items: z.array(rephraseItem).min(1).max(12) })

export const correctionSchema = z.object({
  correct: z.boolean(),
  corrected: z.string(),
  explanation: str,
  rule: z.string(),
})

export const fixSentenceSchema = z.object({
  corrected: str,
  explanation: str,
  alternatives: z.array(z.object({ text: str, note: z.string() })).length(3),
})

export const vocabBatchSchema = z.object({
  words: z.array(z.object({ term: str, translation: str, example: str })).min(1).max(60),
})

export const orderItem = z.object({
  es: str,
  accepted_orders: z.array(str).min(1).max(6),
  rule: str,
  tip: z.string().default(''),
})
export const orderBatchSchema = z.object({ items: z.array(orderItem).min(1).max(12) })

export const orderCheckSchema = z.object({ valid: z.boolean(), explanation: str })

export const answerCheckSchema = z.object({ correct: z.boolean(), feedback: str })

export const GAP_LEVELS = [1, 2, 3] as const
export const songLessonBase = z.object({
  summary: str,
  vocabulary: z.array(z.object({ term: str, translation: str, note: z.string().default('') })).max(15),
  colloquial: z.array(z.object({ form: str, meaning: str })).max(10),
  grammar: z.array(z.object({ point: str, explanation: str, line: z.number().int().min(1) })).max(6),
  gaps: z
    .array(z.object({ line: z.number().int().min(1), word: str, level: z.union([z.literal(1), z.literal(2), z.literal(3)]) }))
    .min(6)
    .max(80),
  rephrase: z.array(z.object({ line: z.number().int().min(1), instruction: str })).max(6),
  questions: z.array(z.object({ question: str, sample_answer: str })).max(5),
})
export type SongLesson = z.infer<typeof songLessonBase>

/** Valida además que los huecos existan en su verso y estén repartidos por TODA la letra. */
export function songLessonSchema(lines: string[]) {
  return songLessonBase.superRefine((l, ctx) => {
    const n = lines.length
    l.gaps.forEach((g, i) => {
      const text = lines[g.line - 1]
      if (!text || !new RegExp(`(^|[^\\p{L}'])${escapeRe(g.word)}($|[^\\p{L}'])`, 'iu').test(text))
        ctx.addIssue({ code: 'custom', path: ['gaps', i], message: `gap word "${g.word}" is not in line ${g.line}` })
    })
    if (n >= 9) {
      const thirds = [0, 0, 0]
      for (const g of l.gaps) thirds[Math.min(2, Math.floor(((g.line - 1) / n) * 3))]!++
      if (thirds.some((c) => c === 0))
        ctx.addIssue({ code: 'custom', path: ['gaps'], message: 'gaps must be spread over the WHOLE lyric (first, middle and last third)' })
    }
  })
}
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
