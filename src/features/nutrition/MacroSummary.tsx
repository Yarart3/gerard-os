import { ProgressBar } from '../../components/ui'
import { formatNumber } from '../../lib/format'
import type { NutritionSettings } from '../gym/gymSettings'
import type { Macros } from './logic/macros'
import n from './Nutrition.module.css'

const MACRO_LABEL = { protein: 'Proteína', carbs: 'Carbohidratos', fat: 'Grasa', fiber: 'Fibra' } as const

/** Kcal y macros frente a los objetivos (por día o media diaria). */
export function MacroSummary({
  totals,
  targets,
  caption,
}: {
  totals: Macros
  targets: NutritionSettings
  caption: string
}) {
  const left = targets.kcal - totals.kcal
  return (
    <>
      <div className={n.kcalHead}>
        <span className={n.kcalBig}>
          {formatNumber(Math.round(totals.kcal), 0)}
          <span className={n.slotKcal}> / {formatNumber(targets.kcal, 0)} kcal</span>
        </span>
        <span className={n.slotKcal}>
          {left >= 0
            ? `Quedan ${formatNumber(Math.round(left), 0)}`
            : `+${formatNumber(Math.round(-left), 0)}`}
        </span>
      </div>
      <ProgressBar
        value={targets.kcal ? totals.kcal / targets.kcal : 0}
        label={`${caption}: kcal frente al objetivo`}
        tone={totals.kcal > targets.kcal ? 'orange' : 'accent'}
      />
      <div className={n.macroGrid}>
        {(Object.keys(MACRO_LABEL) as (keyof typeof MACRO_LABEL)[]).map((k) => (
          <div key={k} className={n.macro}>
            <div className={n.macroHead}>
              <span>{MACRO_LABEL[k]}</span>
              <span>
                {formatNumber(totals[k], 0)} / {formatNumber(targets[k], 0)} g
              </span>
            </div>
            <ProgressBar
              value={targets[k] ? totals[k] / targets[k] : 0}
              label={`${caption}: ${MACRO_LABEL[k]}`}
              tone={k === 'protein' || k === 'fiber' ? 'green' : 'accent'}
            />
          </div>
        ))}
      </div>
    </>
  )
}
