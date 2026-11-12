import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import type { Tables, TablesInsert } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'
import { offlineKeys } from '../../lib/offline/keys'
import { withNewId } from '../../lib/offline/ids'
import { useOfflineMutation } from '../../lib/offline/useOfflineMutation'
import { fromCents, monthBounds, monthOf, summarizeMonth } from './logic/expenses'
import { countPending } from './logic/watchlist'
import { useToday } from '../../lib/useToday'

export type Expense = Tables<'expenses'>
export type ExpenseCategory = Tables<'expense_categories'>
export type WatchItem = Tables<'watchlist'>
export type Note = Tables<'notes'>

import { personalKeys } from './keys'
export { personalKeys }

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

/** Crear o editar un gasto: se apunta aunque no haya red y se envía solo al volver. */
export function useSaveExpense() {
  return useOfflineMutation(offlineKeys.expenseSave, (e: TablesInsert<'expenses'>) => withNewId(e))
}

export function useDeleteExpense() {
  return useOfflineMutation<string>(offlineKeys.expenseDelete)
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
  return useOfflineMutation(offlineKeys.watchSave, (w: TablesInsert<'watchlist'>) => withNewId(w))
}

export function useDeleteWatch() {
  return useOfflineMutation<string>(offlineKeys.watchDelete)
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
  return useOfflineMutation(offlineKeys.noteSave, (n: TablesInsert<'notes'>) => withNewId(n))
}

export function useDeleteNote() {
  return useOfflineMutation<string>(offlineKeys.noteDelete)
}

// ---------- Resumen (tarjeta de Personal en Hoy, Fase 6) ----------

/** Gastos del mes en curso (euros) y elementos pendientes de la watchlist. */
export function usePersonalSummary() {
  const month = monthOf(useToday())
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
