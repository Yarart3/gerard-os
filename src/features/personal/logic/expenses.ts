// Gastos: toda la aritmética va en céntimos enteros para evitar errores de coma flotante.
export type ExpenseLike = { amount: number; category_id: string | null; date: string }
export type CategoryLike = { id: string; name: string; monthly_budget: number | null }

export const toCents = (euros: number) => Math.round(Number((euros * 100).toFixed(6)))
export const fromCents = (cents: number) => cents / 100

/** "YYYY-MM" de una fecha ISO "YYYY-MM-DD" (las fechas de gasto son de calendario, ya en hora de Madrid). */
export const monthOf = (iso: string) => iso.slice(0, 7)

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const idx = (y ?? 1970) * 12 + ((m ?? 1) - 1) + delta
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`
}

/** Primer día del mes y primer día del siguiente (límite exclusivo). */
export function monthBounds(month: string) {
  return { from: `${month}-01`, to: `${addMonths(month, 1)}-01` }
}

export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const text = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, 1)),
  )
  return text.charAt(0).toLocaleUpperCase('es-ES') + text.slice(1)
}

export type CategorySpend = {
  id: string | null // null = sin categoría
  name: string
  spentCents: number
  budgetCents: number | null
}

export type MonthSummary = {
  totalCents: number
  budgetCents: number // suma de los presupuestos de las categorías
  byCategory: CategorySpend[]
}

/** Resumen de un mes: total, presupuesto total y desglose por categoría (en el orden de `categories`). */
export function summarizeMonth(
  expenses: ExpenseLike[],
  categories: CategoryLike[],
  month: string,
): MonthSummary {
  const spent = new Map<string | null, number>()
  let totalCents = 0
  for (const e of expenses) {
    if (monthOf(e.date) !== month) continue
    const c = toCents(e.amount)
    totalCents += c
    const key = e.category_id && categories.some((k) => k.id === e.category_id) ? e.category_id : null
    spent.set(key, (spent.get(key) ?? 0) + c)
  }
  const byCategory: CategorySpend[] = categories.map((k) => ({
    id: k.id,
    name: k.name,
    spentCents: spent.get(k.id) ?? 0,
    budgetCents: k.monthly_budget === null ? null : toCents(k.monthly_budget),
  }))
  const other = spent.get(null)
  if (other) byCategory.push({ id: null, name: 'Sin categoría', spentCents: other, budgetCents: null })
  const budgetCents = byCategory.reduce((a, c) => a + (c.budgetCents ?? 0), 0)
  return { totalCents, budgetCents, byCategory }
}

/** Fracción gastada del presupuesto (puede superar 1); 0 si no hay presupuesto. */
export const budgetRatio = (spentCents: number, budgetCents: number | null) =>
  budgetCents ? spentCents / budgetCents : 0
