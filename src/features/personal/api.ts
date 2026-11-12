import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import type { Tables, TablesInsert } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'
import { todayISO } from '../../lib/dates'
import { fromCents, monthBounds, monthOf, summarizeMonth } from './logic/expenses'
import { countPending } from './logic/watchlist'

export type Expense = Tables<'expenses'>
export type ExpenseCategory = Tables<'expense_categories'>
export type WatchItem = Tables<'watchlist'>
export type Note = Tables<'notes'>

export const personalKeys = {
  categories: ['expense_categories'] as const,
  expenses: (month: string) => ['expenses', month] as const,
  watchlist: ['watchlist'] as const,
  notes: ['notes'] as const,
}

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

// ---------- Gastos ----------

export function useCategories() {
  return useQuery({
    queryKey: personalKeys.categories,
    queryFn: async () => {
      const { data, error } = await supabase.from('expense_categories').select('*').order('position').order('name')
      fail(error)
      return data ?? []
    },
  })
}

export function useSaveCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (c: TablesInsert<'expense_categories'>) => {
      const { error } = c.id
        ? await supabase.from('expense_categories').update(c).eq('id', c.id)
        : await supabase.from('expense_categories').insert(c)
      fail(error)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: personalKeys.categories }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => fail((await supabase.from('expense_categories').delete().eq('id', id)).error),
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: personalKeys.categories }),
        qc.invalidateQueries({ queryKey: ['expenses'] }),
      ]),
  })
}

/** Gastos de un mes ("YYYY-MM"), del más reciente al más antiguo. */
export function useMonthExpenses(month: string) {
  return useQuery({
    queryKey: personalKeys.expenses(month),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { from, to } = monthBounds(month)
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', from)
        .lt('date', to)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      fail(error)
      return data ?? []
    },
  })
}

export function useSaveExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (e: TablesInsert<'expenses'>) => {
      const { error } = e.id
        ? await supabase.from('expenses').update(e).eq('id', e.id)
        : await supabase.from('expenses').insert(e)
      fail(error)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => fail((await supabase.from('expenses').delete().eq('id', id)).error),
    onSettled: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

// ---------- Watchlist ----------

export function useWatchlist() {
  return useQuery({
    queryKey: personalKeys.watchlist,
    queryFn: async () => {
      const { data, error } = await supabase.from('watchlist').select('*').order('title')
      fail(error)
      return data ?? []
    },
  })
}

export function useSaveWatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (w: TablesInsert<'watchlist'>) => {
      const { error } = w.id
        ? await supabase.from('watchlist').update(w).eq('id', w.id)
        : await supabase.from('watchlist').insert(w)
      fail(error)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: personalKeys.watchlist }),
  })
}

export function useDeleteWatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => fail((await supabase.from('watchlist').delete().eq('id', id)).error),
    onSettled: () => qc.invalidateQueries({ queryKey: personalKeys.watchlist }),
  })
}

// ---------- Notas ----------

export function useNotes() {
  return useQuery({
    queryKey: personalKeys.notes,
    queryFn: async () => {
      const { data, error } = await supabase.from('notes').select('*').order('updated_at', { ascending: false })
      fail(error)
      return data ?? []
    },
  })
}

export function useSaveNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (n: TablesInsert<'notes'>) => {
      const { error } = n.id
        ? await supabase.from('notes').update(n).eq('id', n.id)
        : await supabase.from('notes').insert(n)
      fail(error)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: personalKeys.notes }),
  })
}

export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => fail((await supabase.from('notes').delete().eq('id', id)).error),
    onSettled: () => qc.invalidateQueries({ queryKey: personalKeys.notes }),
  })
}

// ---------- Resumen (tarjeta de Personal en Hoy, Fase 6) ----------

/** Gastos del mes en curso (euros) y elementos pendientes de la watchlist. */
export function usePersonalSummary() {
  const month = monthOf(todayISO())
  const expenses = useMonthExpenses(month)
  const categories = useCategories()
  const watch = useWatchlist()
  const summary = summarizeMonth(expenses.data ?? [], categories.data ?? [], month)
  return {
    isLoading: expenses.isLoading || categories.isLoading || watch.isLoading,
    monthSpent: fromCents(summary.totalCents),
    monthBudget: summary.budgetCents ? fromCents(summary.budgetCents) : null,
    watchPending: countPending(watch.data ?? []),
  }
}
