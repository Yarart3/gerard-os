import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Json, Tables } from '../../lib/database.types'
import { addDays, todayISO } from '../../lib/dates'
import { supabase } from '../../lib/supabase'
import { applyPoints, type DailyRow } from './logic/daily'
import { reviewCard } from './logic/leitner'
import { DEFAULT_LEVEL, LEVELS, parseAnswers, type EnglishAnswers, type EnglishProfile, type Level } from './profile'

export type VocabCard = Tables<'vocab_cards'>
export type EnglishExercise = Tables<'english_exercises'>
export type Song = Tables<'songs'>
export type Artist = Tables<'artists'>
export type Attempt = Tables<'english_attempts'>

export const enKeys = {
  profile: ['english', 'profile'] as const,
  daily: ['english', 'daily'] as const,
  vocab: ['english', 'vocab'] as const,
  exercises: (section: string) => ['english', 'exercises', section] as const,
  attempts: ['english', 'attempts'] as const,
  songs: ['english', 'songs'] as const,
  artists: ['english', 'artists'] as const,
}

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

// ---------- Perfil ----------

export function useProfile() {
  return useQuery({
    queryKey: enKeys.profile,
    queryFn: async (): Promise<EnglishProfile | null> => {
      const { data, error } = await supabase.from('english_profile').select('level, answers').maybeSingle()
      fail(error)
      if (!data) return null
      const level = LEVELS.includes(data.level as Level) ? (data.level as Level) : DEFAULT_LEVEL
      return { level, answers: parseAnswers(data.answers) }
    },
  })
}

export function useSaveProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { level: Level; answers: EnglishAnswers }) => {
      const { error } = await supabase
        .from('english_profile')
        .upsert({ level: p.level, answers: p.answers as unknown as Json }, { onConflict: 'user_id' })
      fail(error)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: enKeys.profile }),
  })
}

// ---------- Puntos y racha ----------

export function useDaily() {
  return useQuery({
    queryKey: enKeys.daily,
    queryFn: async (): Promise<DailyRow[]> => {
      const { data, error } = await supabase
        .from('english_daily')
        .select('date, points, streak')
        .gte('date', addDays(todayISO(), -30))
        .order('date', { ascending: false })
      fail(error)
      return data ?? []
    },
  })
}

/** Suma puntos al día de hoy (Europe/Madrid) y recalcula la racha. */
export function useAward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (points: number) => {
      const today = todayISO()
      const { data, error } = await supabase
        .from('english_daily')
        .select('date, points, streak')
        .gte('date', addDays(today, -1))
      fail(error)
      const row = applyPoints(data ?? [], today, points)
      fail((await supabase.from('english_daily').upsert(row, { onConflict: 'user_id,date' })).error)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: enKeys.daily }),
  })
}

// ---------- Intentos ----------

export type AttemptInput = { exercise_id?: string | null; answer: string; correct: boolean; feedback?: string; rule?: string }

export function useRecordAttempt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (a: AttemptInput) => fail((await supabase.from('english_attempts').insert(a)).error),
    onSettled: () => qc.invalidateQueries({ queryKey: enKeys.attempts }),
  })
}

export function useRecentErrors(limit = 6) {
  return useQuery({
    queryKey: [...enKeys.attempts, 'errors', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('english_attempts')
        .select('*')
        .eq('correct', false)
        .order('created_at', { ascending: false })
        .limit(limit)
      fail(error)
      return data ?? []
    },
  })
}

// ---------- Vocabulario ----------

export function useVocab() {
  return useQuery({
    queryKey: enKeys.vocab,
    queryFn: async () => {
      const { data, error } = await supabase.from('vocab_cards').select('*').order('created_at', { ascending: false })
      fail(error)
      return data ?? []
    },
  })
}

/** Inserta tarjetas nuevas (en la caja 1, para hoy) omitiendo términos que ya existen. Devuelve cuántas añadió. */
export function useAddCards() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (cards: { term: string; translation: string; example?: string; source: string }[]) => {
      const { data, error } = await supabase.from('vocab_cards').select('term')
      fail(error)
      const have = new Set((data ?? []).map((c) => c.term.trim().toLowerCase()))
      const fresh = cards.filter((c) => {
        const k = c.term.trim().toLowerCase()
        if (!k || have.has(k)) return false
        have.add(k)
        return true
      })
      if (fresh.length) fail((await supabase.from('vocab_cards').insert(fresh.map((c) => ({ ...c, term: c.term.trim(), due_on: todayISO() })))).error)
      return fresh.length
    },
    onSettled: () => qc.invalidateQueries({ queryKey: enKeys.vocab }),
  })
}

export function useReviewCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ card, correct }: { card: Pick<VocabCard, 'id' | 'box'>; correct: boolean }) =>
      fail((await supabase.from('vocab_cards').update(reviewCard(card, correct, todayISO())).eq('id', card.id)).error),
    onSettled: () => qc.invalidateQueries({ queryKey: enKeys.vocab }),
  })
}

export function useDeleteCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => fail((await supabase.from('vocab_cards').delete().eq('id', id)).error),
    onSettled: () => qc.invalidateQueries({ queryKey: enKeys.vocab }),
  })
}

// ---------- Ejercicios generados (se guardan al crearse: funcionan sin IA) ----------

export function useExercises(section: 'rephrase' | 'order') {
  return useQuery({
    queryKey: enKeys.exercises(section),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('english_exercises')
        .select('*')
        .eq('section', section)
        .order('created_at', { ascending: false })
        .limit(300)
      fail(error)
      return data ?? []
    },
  })
}

export function useSaveExercises(section: 'rephrase' | 'order') {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (rows: { topic: string; payload: Json; solution?: Json }[]) =>
      fail((await supabase.from('english_exercises').insert(rows.map((r) => ({ ...r, section })))).error),
    onSettled: () => qc.invalidateQueries({ queryKey: enKeys.exercises(section) }),
  })
}

// ---------- Canciones y artistas ----------

export function useSongs() {
  return useQuery({
    queryKey: enKeys.songs,
    queryFn: async () => {
      const { data, error } = await supabase.from('songs').select('*').order('created_at', { ascending: false })
      fail(error)
      return data ?? []
    },
  })
}

export function useSaveSong() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (s: { id?: string; artist: string; title: string; lyrics?: string | null; lesson?: Json | null }) => {
      const { error } = s.id ? await supabase.from('songs').update(s).eq('id', s.id) : await supabase.from('songs').insert(s)
      fail(error)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: enKeys.songs }),
  })
}

export function useDeleteSong() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => fail((await supabase.from('songs').delete().eq('id', id)).error),
    onSettled: () => qc.invalidateQueries({ queryKey: enKeys.songs }),
  })
}

export function useArtists() {
  return useQuery({
    queryKey: enKeys.artists,
    queryFn: async () => {
      const { data, error } = await supabase.from('artists').select('*').order('name')
      fail(error)
      return data ?? []
    },
  })
}

export function useSaveArtist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (a: { id?: string; name: string; spotify_url?: string | null; youtube_url?: string | null }) => {
      const { error } = a.id ? await supabase.from('artists').update(a).eq('id', a.id) : await supabase.from('artists').insert(a)
      fail(error)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: enKeys.artists }),
  })
}

export function useDeleteArtist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => fail((await supabase.from('artists').delete().eq('id', id)).error),
    onSettled: () => qc.invalidateQueries({ queryKey: enKeys.artists }),
  })
}

// ---------- Reiniciar progreso ----------

/** Borra puntos, rachas e intentos y devuelve todas las tarjetas a la caja 1. No toca ejercicios ni canciones. */
export function useResetProgress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const zero = '00000000-0000-0000-0000-000000000000'
      fail((await supabase.from('english_daily').delete().neq('id', zero)).error)
      fail((await supabase.from('english_attempts').delete().neq('id', zero)).error)
      fail((await supabase.from('vocab_cards').update({ box: 1, due_on: todayISO() }).neq('id', zero)).error)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['english'] }),
  })
}
