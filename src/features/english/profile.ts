import { z } from 'zod'

// Cuestionario de Inglés (CLAUDE.md §7). Las respuestas viven en `english_profile.answers`, nunca en el repo.
export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const
export type Level = (typeof LEVELS)[number]

export const NATIVE_OPTIONS = [
  { value: 'ca-es', label: 'Catalán y castellano' },
  { value: 'es', label: 'Castellano' },
  { value: 'ca', label: 'Catalán' },
  { value: 'other', label: 'Otra' },
] as const
export const HARDEST_OPTIONS = [
  { value: 'listening', label: 'Entender al oír' },
  { value: 'vocabulary', label: 'Vocabulario' },
  { value: 'grammar', label: 'Gramática' },
  { value: 'speaking', label: 'Hablar' },
  { value: 'writing', label: 'Escribir' },
] as const
export const GOAL_OPTIONS = [
  { value: 'work', label: 'Trabajo y carrera' },
  { value: 'cambridge', label: 'Examen Cambridge C1 Advanced' },
  { value: 'travel', label: 'Viajar' },
  { value: 'media', label: 'Series, pelis y música' },
  { value: 'study', label: 'Estudios' },
] as const
export const EXPLAIN_OPTIONS = [
  { value: 'es', label: 'Castellano' },
  { value: 'en', label: 'Inglés' },
  { value: 'mix', label: 'Mezcla' },
] as const
export const TOPIC_OPTIONS = [
  { value: 'tech', label: 'Tecnología y programar' },
  { value: 'tv', label: 'Series y pelis' },
  { value: 'gym', label: 'Gym y CrossFit' },
  { value: 'music', label: 'Música' },
  { value: 'games', label: 'Videojuegos' },
  { value: 'travel', label: 'Viajes' },
  { value: 'food', label: 'Cocina' },
  { value: 'science', label: 'Ciencia' },
  { value: 'business', label: 'Negocios' },
] as const
export const MINUTES_OPTIONS = [
  { value: '10', label: '10 min' },
  { value: '20', label: '20 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
] as const
export const DEVICE_OPTIONS = [
  { value: 'mobile', label: 'Móvil' },
  { value: 'desktop', label: 'Ordenador' },
  { value: 'both', label: 'Los dos' },
] as const
export const ACCENT_OPTIONS = [
  { value: 'alternate', label: 'Alternar' },
  { value: 'en-GB', label: 'Británico' },
  { value: 'en-US', label: 'Americano' },
] as const

export const answersSchema = z.object({
  native: z.string().default('ca-es'),
  hardest: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  explain: z.enum(['es', 'en', 'mix']).default('mix'),
  topics: z.array(z.string()).default([]),
  minutes: z.number().default(20),
  device: z.string().default('both'),
  accent: z.enum(['alternate', 'en-GB', 'en-US']).default('alternate'),
  artists: z.string().default(''), // texto libre, opcional
  fun: z.string().default(''), // detalles personales para los ejemplos, opcional
})
export type EnglishAnswers = z.infer<typeof answersSchema>

export const EMPTY_ANSWERS: EnglishAnswers = answersSchema.parse({})

export type EnglishProfile = { level: Level; answers: EnglishAnswers }
export const DEFAULT_LEVEL: Level = 'B2'

export function parseAnswers(raw: unknown): EnglishAnswers {
  const r = answersSchema.safeParse(raw ?? {})
  return r.success ? r.data : EMPTY_ANSWERS
}

export const labelOf = (opts: readonly { value: string; label: string }[], v: string) =>
  opts.find((o) => o.value === v)?.label ?? v
