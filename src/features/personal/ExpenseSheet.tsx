import { useState, type FormEvent } from 'react'
import { NumberInput, Sheet, useToast } from '../../components/ui'
import { useCategories, useDeleteExpense, useSaveExpense, type Expense } from './api'
import { monthOf } from './logic/expenses'
import s from './Personal.module.css'
import { useToday } from '../../lib/useToday'

type Props = { expense: Expense | 'new' | null; defaultMonth: string; onClose: () => void }

export function ExpenseSheet({ expense, defaultMonth, onClose }: Props) {
  return (
    <Sheet open={expense !== null} onClose={onClose} title={expense === 'new' ? 'Nuevo gasto' : 'Gasto'}>
      {expense && (
        <Form
          key={expense === 'new' ? 'new' : expense.id}
          expense={expense === 'new' ? null : expense}
          defaultMonth={defaultMonth}
          onClose={onClose}
        />
      )}
    </Sheet>
  )
}

function Form({ expense, defaultMonth, onClose }: { expense: Expense | null; defaultMonth: string; onClose: () => void }) {
  const toast = useToast()
  const save = useSaveExpense()
  const del = useDeleteExpense()
  const categories = useCategories()
  const today = useToday()
  const [amount, setAmount] = useState<number | null>(expense?.amount ?? null)
  const [categoryId, setCategoryId] = useState(expense?.category_id ?? '')
  const [date, setDate] = useState(expense?.date ?? (monthOf(today) === defaultMonth ? today : `${defaultMonth}-01`))
  const [note, setNote] = useState(expense?.note ?? '')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (amount === null || amount <= 0) return toast('Pon un importe mayor que 0', 'error')
    if (!date) return toast('Pon una fecha', 'error')
    try {
      await save.mutateAsync({
        ...(expense ? { id: expense.id } : {}),
        amount: Math.round(amount * 100) / 100,
        category_id: categoryId || null,
        date,
        note: note.trim() || null,
      })
      toast('Gasto guardado')
      onClose()
    } catch {
      toast('No se ha podido guardar', 'error')
    }
  }
  const remove = async () => {
    if (!expense || !confirm('¿Eliminar este gasto?')) return
    try {
      await del.mutateAsync(expense.id)
      toast('Gasto eliminado')
      onClose()
    } catch {
      toast('No se ha podido eliminar', 'error')
    }
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <label className="field">
        <span className="field-label">Importe (€)</span>
        <NumberInput decimals={2} inputMode="decimal" value={amount} onCommit={setAmount} placeholder="0,00" autoFocus={!expense} />
      </label>
      <label className="field">
        <span className="field-label">Fecha</span>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <label className={`field ${s.full}`}>
        <span className="field-label">Categoría</span>
        <select className={`input ${s.select}`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Sin categoría</option>
          {(categories.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className={`field ${s.full}`}>
        <span className="field-label">Nota</span>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <button type="submit" className={`btn btn-primary ${s.full}`} disabled={save.isPending}>
        Guardar
      </button>
      {expense && (
        <button type="button" className={`btn ${s.dangerBtn} ${s.full}`} onClick={remove} disabled={del.isPending}>
          Eliminar gasto
        </button>
      )}
    </form>
  )
}
