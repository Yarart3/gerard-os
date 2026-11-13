import { useState } from 'react'
import { NeedsConnection, NumberInput, useToast } from '../../../components/ui'
import { useOnline } from '../../../lib/offline/connectivity'
import { formatKcal } from '../../../lib/format'
import { runAi } from '../../english/ai/run'
import { aiMessage } from '../../english/ai/useAi'
import { useEnglishSettings } from '../../english/englishSettings'
import type { Exercise, Workout } from '../api'
import { kcalTask, type Energy } from '../energy'
import { useEnergyMethods } from './useEnergyMethods'
import s from '../Gym.module.css'

type Props = {
  workout: Workout
  exercises: ReadonlyMap<string, Exercise>
  minutes: number | null
  watch: number | null
  energy: Energy
  onEnergy: (e: Energy) => void
}

const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '')

export function EnergyPanel({ workout, exercises, minutes, watch, energy, onEnergy }: Props) {
  const toast = useToast()
  const online = useOnline()
  const provider = useEnglishSettings().value.ai_provider ?? undefined
  const avgHr = energy.avg_hr ?? null
  const { methods, combined, body } = useEnergyMethods(workout, exercises, minutes, avgHr)
  const [busy, setBusy] = useState(false)
  const ai = energy.ai ?? null

  const askAi = async () => {
    setBusy(true)
    try {
      const r = await runAi(
        kcalTask({ items: workout.workout_items, exercises, minutes, avgHr, body, formulas: methods, notes: workout.notes }),
        { provider },
      )
      onEnergy({ ...energy, combined, ai: { ...r, at: new Date().toISOString() } })
    } catch (e) {
      toast(aiMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={s.energy}>
      <label className="field">
        <span className="field-label">Pulso medio (ppm)</span>
        <NumberInput
          decimals={0}
          placeholder="Del Apple Watch"
          value={avgHr}
          onCommit={(v) => onEnergy({ ...energy, avg_hr: v === null ? null : Math.round(v) })}
        />
      </label>

      <div className={s.methods} role="list" aria-label="Estimaciones de calorías">
        {methods.map((m) => (
          <div key={m.id} className={s.method} role="listitem">
            <span className={s.methodText}>
              <span>{m.label}</span>
              <span className={s.small}>{m.note}</span>
            </span>
            <span className={m.kcal === null ? s.small : s.methodValue}>{m.kcal === null ? '—' : formatKcal(m.kcal)}</span>
          </div>
        ))}
        <div className={`${s.method} ${s.methodMain}`} role="listitem">
          <span className={s.methodText}>
            <span>Combinada</span>
            <span className={s.small}>Mediana de las fórmulas disponibles</span>
          </span>
          <span className={s.methodValue}>{combined === null ? '—' : formatKcal(combined)}</span>
        </div>
      </div>

      <div className={s.aiBox}>
        {ai ? (
          <>
            <div className={s.method}>
              <span className={s.methodText}>
                <span>Estimación de la IA</span>
                <span className={s.small}>
                  {formatKcal(ai.low)} – {formatKcal(ai.high)} · confianza {ai.confidence}
                </span>
              </span>
              <span className={s.methodValue}>{formatKcal(ai.kcal)}</span>
            </div>
            <p className={s.aiText}>{ai.explanation}</p>
          </>
        ) : (
          <p className={s.small} style={{ margin: 0 }}>
            La IA mira tus ejercicios, series, descansos probables y las fórmulas, y da su propia estimación.
          </p>
        )}
        <div className={s.actions}>
          <NeedsConnection />
          <button
            type="button"
            className={`btn ${s.accentBtn}`}
            disabled={busy || !online || !workout.workout_items.length}
            onClick={askAi}
          >
            {busy ? 'Calculando…' : ai ? 'Recalcular con IA' : 'Calcular con IA'}
          </button>
        </div>
      </div>

      {watch !== null && (combined !== null || ai) && (
        <p className={s.small} style={{ margin: 0 }}>
          Apple Watch {formatKcal(watch)}
          {combined !== null && ` · combinada ${sign(combined - watch)}${formatKcal(Math.abs(combined - watch))}`}
          {ai && ` · IA ${sign(ai.kcal - watch)}${formatKcal(Math.abs(ai.kcal - watch))}`}
        </p>
      )}
    </div>
  )
}
