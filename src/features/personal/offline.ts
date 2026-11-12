import type { QueryClient } from '@tanstack/react-query'
import type { Tables, TablesInsert } from '../../lib/database.types'
import { removeRow, mapLists, nowIso, upsertRow } from '../../lib/offline/cache'
import { defineOffline } from '../../lib/offline/define'
import { deleteRow, saveRow } from '../../lib/offline/db'
import { offlineKeys } from '../../lib/offline/keys'
import { rowOf, type SaveVars } from '../../lib/offline/ids'
import { personalKeys } from './keys'

type Expense = Tables<'expenses'>
type Note = Tables<'notes'>
type Watch = Tables<'watchlist'>

const stamp = () => ({ created_at: nowIso(), updated_at: nowIso(), user_id: '' })

function byDateDesc(a: Expense, b: Expense) {
  return b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)
}

export function registerPersonalMutations(qc: QueryClient) {
  defineOffline<SaveVars<TablesInsert<'expenses'>>>(qc, {
    key: offlineKeys.expenseSave,
    run: (v) => saveRow('expenses', v.isNew, rowOf(v)),
    invalidate: [['expenses']],
    optimistic: (c, v) => {
      const row = rowOf(v)
      mapLists<Expense>(c, ['expenses'], (list, key) => {
        const old = list.find((x) => x.id === row.id)
        const next = { ...(old ?? stamp()), ...row } as Expense
        const month = key[1]
        const rest = removeRow(list, row.id)
        // Un gasto cambia de mes al editar su fecha: solo entra en la lista de su mes.
        return typeof month === 'string' && next.date.slice(0, 7) !== month
          ? rest
          : [...rest, next].sort(byDateDesc)
      })
    },
  })
  defineOffline<string>(qc, {
    key: offlineKeys.expenseDelete,
    run: (id) => deleteRow('expenses', id),
    invalidate: [['expenses']],
    optimistic: (c, id) => mapLists<Expense>(c, ['expenses'], (l) => removeRow(l, id)),
  })

  defineOffline<SaveVars<TablesInsert<'notes'>>>(qc, {
    key: offlineKeys.noteSave,
    run: (v) => saveRow('notes', v.isNew, rowOf(v)),
    invalidate: [personalKeys.notes],
    optimistic: (c, v) => {
      const row = rowOf(v)
      mapLists<Note>(c, personalKeys.notes, (list) => {
        const old = list.find((x) => x.id === row.id)
        const next = { ...(old ?? stamp()), ...row, updated_at: nowIso() } as Note
        return [next, ...removeRow(list, row.id)] // orden de la consulta: más reciente primero
      })
    },
  })
  defineOffline<string>(qc, {
    key: offlineKeys.noteDelete,
    run: (id) => deleteRow('notes', id),
    invalidate: [personalKeys.notes],
    optimistic: (c, id) => mapLists<Note>(c, personalKeys.notes, (l) => removeRow(l, id)),
  })

  defineOffline<SaveVars<TablesInsert<'watchlist'>>>(qc, {
    key: offlineKeys.watchSave,
    run: (v) => saveRow('watchlist', v.isNew, rowOf(v)),
    invalidate: [personalKeys.watchlist],
    optimistic: (c, v) => {
      const row = rowOf(v)
      mapLists<Watch>(c, personalKeys.watchlist, (list) => {
        const next = { ...(list.find((x) => x.id === row.id) ?? stamp()), ...row } as Watch
        return upsertRow(list, next, false).sort((a, b) => a.title.localeCompare(b.title))
      })
    },
  })
  defineOffline<string>(qc, {
    key: offlineKeys.watchDelete,
    run: (id) => deleteRow('watchlist', id),
    invalidate: [personalKeys.watchlist],
    optimistic: (c, id) => mapLists<Watch>(c, personalKeys.watchlist, (l) => removeRow(l, id)),
  })
}
