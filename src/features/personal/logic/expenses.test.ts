import { todayISO } from '../../../lib/dates'
import { addMonths, budgetRatio, formatMonth, monthBounds, monthOf, summarizeMonth, toCents } from './expenses'

const cats = [
  { id: 'a', name: 'Comida', monthly_budget: 200 },
  { id: 'b', name: 'Ocio', monthly_budget: 50.5 },
  { id: 'c', name: 'Otros', monthly_budget: null },
]

describe('gastos', () => {
  it('suma céntimos sin errores de coma flotante', () => {
    const exp = [0.1, 0.2, 0.3, 1.15, 2.675].map((amount) => ({ amount, category_id: 'a', date: '2026-11-05' }))
    const r = summarizeMonth(exp, cats, '2026-11')
    expect(r.totalCents).toBe(10 + 20 + 30 + 115 + 268)
    expect(toCents(1.005)).toBe(101)
    expect(0.1 + 0.2).not.toBe(0.3) // el problema que se evita
  })

  it('desglosa por categoría y frente al presupuesto', () => {
    const exp = [
      { amount: 24.3, category_id: 'a', date: '2026-11-01' },
      { amount: 60.25, category_id: 'b', date: '2026-11-30' },
      { amount: 5, category_id: null, date: '2026-11-10' },
      { amount: 9, category_id: 'zzz', date: '2026-11-11' }, // categoría borrada
    ]
    const r = summarizeMonth(exp, cats, '2026-11')
    expect(r.totalCents).toBe(9855)
    expect(r.budgetCents).toBe(25050)
    expect(r.byCategory.map((c) => [c.name, c.spentCents, c.budgetCents])).toEqual([
      ['Comida', 2430, 20000],
      ['Ocio', 6025, 5050],
      ['Otros', 0, null],
      ['Sin categoría', 1400, null],
    ])
    expect(budgetRatio(6025, 5050)).toBeGreaterThan(1)
    expect(budgetRatio(100, null)).toBe(0)
  })

  it('respeta los límites de mes', () => {
    const exp = [
      { amount: 1, category_id: 'a', date: '2026-10-31' },
      { amount: 2, category_id: 'a', date: '2026-11-01' },
      { amount: 4, category_id: 'a', date: '2026-11-30' },
      { amount: 8, category_id: 'a', date: '2026-12-01' },
    ]
    expect(summarizeMonth(exp, cats, '2026-11').totalCents).toBe(600)
    expect(monthBounds('2026-11')).toEqual({ from: '2026-11-01', to: '2026-12-01' })
    expect(monthBounds('2026-12')).toEqual({ from: '2026-12-01', to: '2027-01-01' })
  })

  it('el mes en curso usa la fecha de Madrid', () => {
    // 30 nov 23:30 UTC ya es 1 dic en Madrid (UTC+1)
    expect(monthOf(todayISO(new Date('2026-11-30T23:30:00Z')))).toBe('2026-12')
    expect(monthOf(todayISO(new Date('2026-06-30T22:30:00Z')))).toBe('2026-07') // verano, UTC+2
  })

  it('navega entre meses y cruza años', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-03', -15)).toBe('2024-12')
    expect(formatMonth('2026-11')).toBe('Noviembre de 2026')
  })
})
