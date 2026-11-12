import { useState } from 'react'
import { Card } from '../../components/ui'
import { ChevronLeft, ChevronRight } from '../../components/ui/icons'
import { addDays, formatDayMonth, formatWeekdayShort, weekDays, weekStart } from '../../lib/dates'
import { formatNumber } from '../../lib/format'
import { useGymSettings } from '../gym/gymSettings'
import { useMeals, useNutritionMaps } from './api'
import { mealItemMacros, scaleMacros } from './logic/macros'
import { weekTable } from './logic/weekly'
import { MacroSummary } from './MacroSummary'
import g from '../gym/Gym.module.css'
import n from './Nutrition.module.css'
import { useToday } from '../../lib/useToday'

const k = (v: number) => (v ? formatNumber(Math.round(v), 0) : '—')

export function WeekView() {
  const today = useToday()
  const [start, setStart] = useState(weekStart(today))
  const days = weekDays(start)
  const end = days[6]!
  const { value: cfg } = useGymSettings()
  const { data: meals = [], isLoading } = useMeals(start, end)
  const maps = useNutritionMaps()
  const slots = [
    ...new Set([...cfg.nutrition.slots, ...meals.filter((m) => m.meal_items.length).map((m) => m.slot)]),
  ]
  const t = weekTable(
    meals.map((m) => ({ date: m.date, slot: m.slot, items: m.meal_items })),
    days,
    (it) => mealItemMacros(it, maps.foodMap, maps.recipeMap),
  )
  const avg = scaleMacros(t.total, t.daysWithData ? 1 / t.daysWithData : 0)

  return (
    <div className={g.stack}>
      <Card>
        <div className={n.dateNav}>
          <button
            type="button"
            className={g.iconBtn}
            aria-label="Semana anterior"
            onClick={() => setStart(addDays(start, -7))}
          >
            <ChevronLeft size={22} />
          </button>
          <span className={n.dateLabel}>
            {formatDayMonth(start)} – {formatDayMonth(end)}
          </span>
          <button
            type="button"
            className={g.iconBtn}
            aria-label="Semana siguiente"
            onClick={() => setStart(addDays(start, 7))}
          >
            <ChevronRight size={22} />
          </button>
        </div>
      </Card>

      <Card title="Kcal por comida y día">
        {isLoading || maps.isLoading ? (
          <p className={g.muted}>Cargando…</p>
        ) : (
          <div className={n.tableWrap}>
            <table className={n.table}>
              <thead>
                <tr>
                  <th scope="col">Día</th>
                  {slots.map((s) => (
                    <th key={s} scope="col">
                      {s}
                    </th>
                  ))}
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d} className={d === today ? n.isToday : undefined}>
                    <th scope="row" style={{ textAlign: 'left', fontWeight: 600, color: 'inherit' }}>
                      {formatWeekdayShort(d)} {Number(d.slice(8))}
                    </th>
                    {slots.map((s) => (
                      <td key={s}>{k(t.cell(d, s))}</td>
                    ))}
                    <td>
                      <strong>{k(t.dayTotals.get(d)?.kcal ?? 0)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Semana</td>
                  {slots.map((s) => (
                    <td key={s}>{k(t.slotTotals.get(s) ?? 0)}</td>
                  ))}
                  <td>{k(t.total.kcal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      <Card title="Media diaria">
        {t.daysWithData ? (
          <MacroSummary totals={avg} targets={cfg.nutrition} caption="Media diaria" />
        ) : (
          <p className={g.muted}>Sin registros esta semana.</p>
        )}
        {t.daysWithData > 0 && (
          <p className={g.small} style={{ margin: '12px 0 0' }}>
            Media de {t.daysWithData} {t.daysWithData === 1 ? 'día con registros' : 'días con registros'}.
            Total semanal: {formatNumber(Math.round(t.total.kcal), 0)} kcal · P{' '}
            {formatNumber(t.total.protein, 0)} g · C {formatNumber(t.total.carbs, 0)} g · G{' '}
            {formatNumber(t.total.fat, 0)} g · F {formatNumber(t.total.fiber, 0)} g
          </p>
        )}
      </Card>
    </div>
  )
}
