import type { QueryClient } from '@tanstack/react-query'
import type { Tables } from '../../lib/database.types'
import { db, insertOnce, updateRow } from '../../lib/offline/db'
import { defineOffline } from '../../lib/offline/define'
import { fail } from '../../lib/offline/errors'
import { addDays } from '../../lib/dates'
import { offlineKeys } from '../../lib/offline/keys'
import { applyPoints, type DailyRow } from './logic/daily'
import { enKeys } from './keys'

export type AttemptVars = {
  id: string
  created_at: string
  exercise_id?: string | null
  answer: string
  correct: boolean
  feedback?: string
  rule?: string
}
export type AwardVars = { points: number; date: string }
export type ReviewVars = { id: string; box: number; due_on: string }

export function registerEnglishMutations(qc: QueryClient) {
  defineOffline<AttemptVars>(qc, {
    key: offlineKeys.enAttempt,
    invalidate: [enKeys.attempts],
    run: (v) => insertOnce('english_attempts', v),
  })

  // La fecha se fija al apuntar (no al enviar): lo hecho de madrugada sin red cuenta para su día.
  // Limitación conocida: si la respuesta se pierde tras aplicarse en el servidor, el reintento suma de nuevo.
  defineOffline<AwardVars>(qc, {
    key: offlineKeys.enAward,
    invalidate: [enKeys.daily],
    run: async ({ points, date }) => {
      const { data, error } = await db
        .from('english_daily')
        .select('date, points, streak')
        .gte('date', addDays(date, -1))
      fail(error)
      const row = applyPoints((data ?? []) as DailyRow[], date, points)
      fail((await db.from('english_daily').upsert(row, { onConflict: 'user_id,date' })).error)
    },
    optimistic: (c, { points, date }) =>
      c.setQueryData<DailyRow[]>(enKeys.daily, (rows) => {
        if (!rows) return rows
        const row = applyPoints(rows, date, points)
        return [row, ...rows.filter((r) => r.date !== date)].sort((a, b) => b.date.localeCompare(a.date))
      }),
  })

  defineOffline<ReviewVars>(qc, {
    key: offlineKeys.enReview,
    invalidate: [enKeys.vocab],
    run: ({ id, box, due_on }) => updateRow('vocab_cards', id, { box, due_on }),
    optimistic: (c, { id, box, due_on }) =>
      c.setQueryData<Tables<'vocab_cards'>[]>(enKeys.vocab, (cards) =>
        cards?.map((card) => (card.id === id ? { ...card, box, due_on } : card)),
      ),
  })
}
