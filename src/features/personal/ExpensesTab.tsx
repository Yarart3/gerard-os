import { useMemo, useState } from 'react'
import { Card, ProgressBar } from '../../components/ui'
import { ChevronLeft, ChevronRight, Plus } from '../../components/ui/icons'
import { formatDayMonth, todayISO } from '../../lib/dates'
import { formatEuros } from '../../lib/format'
import { useCategories, useMonthExpenses, type Expense } from './api'
import { ExpenseSheet } from './ExpenseSheet'
import { addMonths, budgetRatio, formatMonth, fromCents, monthOf, summarizeMonth } from './logic/expenses'
import s from './Personal.module.css'

export function ExpensesTab() {
  const currentMonth = monthOf(todayISO())
  const [month, setMonth] = useState(currentMonth)
  const [editing, setEditing] = useState<Expense | 'new' | null>(null)
  const expenses = useMonthExpenses(month)
  const categories = useCategories()
  const list = useMemo(() => expenses.data ?? [], [expenses.data])
  const cats = useMemo(() => categories.data ?? [], [categories.data])
  const summary = useMemo(() => summarizeMonth(list, cats, month), [list, cats, month])
  const catName = useMemo(() => new Map(cats.map((c) => [c.id, c.name])), [cats])
  const hasBudget = summary.budgetCents > 0
  const ratio = budgetRatio(summary.totalCents, summary.budgetCents)
  const left = summary.budgetCents - summary.totalCents

  return (
    <div className={s.stack}>
      <div className={s.monthNav}>
        <button type="button" className={s.iconBtn} aria-label="Mes anterior" onClick={() => setMonth(addMonths(month, -1))}>
          <ChevronLeft size={22} />
        </button>
        <h2 className={s.monthLabel} aria-live="polite">
          {formatMonth(month)}
        </h2>
        <button type="button" className={s.iconBtn} aria-label="Mes siguiente" onClick={() => setMonth(addMonths(month, 1))}>
          <ChevronRight size={22} />
        </button>
      </div>

      <div className={s.grid2}>
        <div className={s.stack}>
          <Card title="Total del mes">
            <div className={s.totalRow}>
              <span className={s.total}>{formatEuros(fromCents(summary.totalCents))}</span>
              {hasBudget && <span className={s.small}>de {formatEuros(fromCents(summary.budgetCents))}</span>}
            </div>
            {hasBudget ? (
              <>
                <ProgressBar value={ratio} label="Gastado del presupuesto mensual" tone={ratio > 1 ? 'orange' : 'accent'} />
                <p className={`${s.small} ${left < 0 ? s.over : ''}`} style={{ margin: '8px 0 0' }}>
                  {left >= 0
                    ? `Te quedan ${formatEuros(fromCents(left))}`
                    : `Te has pasado ${formatEuros(fromCents(-left))}`}
                </p>
              </>
            ) : (
              <p className={s.small} style={{ margin: 0 }}>
                Sin presupuesto: ponlo en los ajustes de Personal.
              </p>
            )}
          </Card>

          <Card title="Por categoría" flush>
            {summary.byCategory.length === 0 ? (
              <p className={s.empty}>Crea categorías en los ajustes de Personal.</p>
            ) : (
              summary.byCategory.map((c) => (
                <div key={c.id ?? 'none'} className={s.catRow}>
                  <div className={s.catHead}>
                    <span>{c.name}</span>
                    <span className={c.budgetCents !== null && c.spentCents > c.budgetCents ? s.over : ''}>
                      {formatEuros(fromCents(c.spentCents))}
                      {c.budgetCents !== null && <span className={s.small}> / {formatEuros(fromCents(c.budgetCents))}</span>}
                    </span>
                  </div>
                  {c.budgetCents !== null && c.budgetCents > 0 && (
                    <ProgressBar
                      value={budgetRatio(c.spentCents, c.budgetCents)}
                      label={`Presupuesto de ${c.name}`}
                      tone={c.spentCents > c.budgetCents ? 'orange' : 'accent'}
                    />
                  )}
                </div>
              ))
            )}
          </Card>
        </div>

        <Card
          title={month === currentMonth ? 'Últimos gastos' : 'Gastos del mes'}
          flush
          action={
            <button type="button" className="btn btn-plain" onClick={() => setEditing('new')}>
              <Plus size={18} /> Añadir
            </button>
          }
        >
          {list.length === 0 ? (
            <p className={s.empty}>{expenses.isLoading ? 'Cargando…' : 'Sin gastos este mes.'}</p>
          ) : (
            list.map((e) => (
              <button key={e.id} type="button" className={s.row} onClick={() => setEditing(e)}>
                <span className={s.rowText}>
                  <span className={s.rowTitle}>{e.note || (e.category_id ? catName.get(e.category_id) : null) || 'Gasto'}</span>
                  <span className={s.rowMeta}>
                    {formatDayMonth(e.date)}
                    {e.category_id && catName.get(e.category_id) ? ` · ${catName.get(e.category_id)}` : ''}
                  </span>
                </span>
                <span className={s.amount}>{formatEuros(e.amount)}</span>
              </button>
            ))
          )}
        </Card>
      </div>
      <ExpenseSheet expense={editing} defaultMonth={month} onClose={() => setEditing(null)} />
    </div>
  )
}
