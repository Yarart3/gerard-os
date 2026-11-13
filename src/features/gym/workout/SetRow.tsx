import { NumberInput } from '../../../components/ui'
import { Check, Minus, Plus } from '../../../components/ui/icons'
import { formatDuration, formatNumber, parseDuration } from '../../../lib/format'
import type { SetRow as SetRowT } from '../api'
import { bodyweightTotal } from '../logic/bodyweight'
import { fromDisplayWeight, toDisplayWeight, type WeightUnit } from '../logic/sets'
import type { ExerciseUnit } from '../logic/types'
import { useState } from 'react'
import s from '../Gym.module.css'

type Props = {
  index: number
  set: SetRowT
  unit: ExerciseUnit
  weightUnit: WeightUnit
  increment: number
  exerciseName: string
  /** Peso corporal: se apunta el lastre y el peso total es peso corporal + lastre. */
  bodyweight?: { kg: number | null } | null
  onChange: (patch: Partial<SetRowT>) => void
  onToggleDone: () => void
}

const round = (n: number) => Math.round(n * 100) / 100

function TimeInput({
  value,
  onCommit,
  label,
}: {
  value: number | null
  onCommit: (v: number | null) => void
  label: string
}) {
  const [text, setText] = useState(value === null ? '' : formatDuration(value))
  const [synced, setSynced] = useState(value)
  if (synced !== value) {
    setSynced(value)
    setText(value === null ? '' : formatDuration(value))
  }
  return (
    <input
      className="input"
      aria-label={label}
      inputMode="numeric"
      placeholder="m:ss"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const v = parseDuration(text)
        if (v !== value) onCommit(v)
      }}
    />
  )
}

/** Una serie: campos según la unidad del ejercicio y botón de hecha. */
export function SetRow({
  index,
  set,
  unit,
  weightUnit,
  increment,
  exerciseName,
  bodyweight,
  onChange,
  onToggleDone,
}: Props) {
  const label = (what: string) => `${what}, serie ${index + 1} de ${exerciseName}`
  const bw = bodyweight ?? null
  const shownKg = bw ? (set.added_kg ?? 0) : set.weight_kg
  const displayW = shownKg === null ? null : round(toDisplayWeight(shownKg, weightUnit))
  const setWeight = (v: number | null) => {
    const kg = v === null ? null : round(fromDisplayWeight(v, weightUnit))
    if (!bw) return onChange({ weight_kg: kg })
    const added = kg ?? 0
    onChange({ added_kg: added, weight_kg: bodyweightTotal(bw.kg, added) })
  }
  // Con peso corporal el lastre puede ser negativo (asistida), sin bajar del peso corporal.
  const minW = bw ? -(bw.kg === null ? Infinity : toDisplayWeight(bw.kg, weightUnit)) : 0
  const step = (dir: 1 | -1) => setWeight(Math.max(minW, round((displayW ?? 0) + dir * increment)))
  const reps = (
    <NumberInput
      aria-label={label('Repeticiones')}
      placeholder="repes"
      decimals={0}
      value={set.reps}
      onCommit={(v) => onChange({ reps: v === null ? null : Math.round(v) })}
    />
  )
  return (
    <div className={`${s.setRow} ${set.done ? s.rowDone : ''}`}>
      <span className={s.setIndex}>{index + 1}</span>
      <div className={s.setFields}>
        {(unit === 'kg' || bw) && (
          <>
            <div className={s.stepper}>
              <button
                type="button"
                className={s.stepBtn}
                aria-label={`Restar ${formatNumber(increment, 2)} ${weightUnit}, serie ${index + 1}`}
                onClick={() => step(-1)}
              >
                <Minus size={18} />
              </button>
              <NumberInput
                aria-label={label(bw ? `Lastre (${weightUnit})` : `Peso (${weightUnit})`)}
                placeholder={bw ? '0' : weightUnit}
                value={displayW}
                onCommit={setWeight}
              />
              <button
                type="button"
                className={s.stepBtn}
                aria-label={`Sumar ${formatNumber(increment, 2)} ${weightUnit}, serie ${index + 1}`}
                onClick={() => step(1)}
              >
                <Plus size={18} />
              </button>
            </div>
            {reps}
          </>
        )}
        {unit === 'reps' && !bw && reps}
        {unit === 'time' && (
          <TimeInput label={label('Tiempo')} value={set.seconds} onCommit={(v) => onChange({ seconds: v })} />
        )}
        {unit === 'meters' && (
          <NumberInput
            aria-label={label('Metros')}
            placeholder="m"
            decimals={1}
            value={set.meters}
            onCommit={(v) => onChange({ meters: v })}
          />
        )}
        {unit === 'calories' && (
          <NumberInput
            aria-label={label('Calorías')}
            placeholder="cal"
            decimals={1}
            value={set.calories}
            onCommit={(v) => onChange({ calories: v })}
          />
        )}
      </div>
      <button
        type="button"
        className={`${s.doneBtn} ${set.done ? s.doneOn : ''}`}
        aria-label={label('Hecha')}
        aria-pressed={set.done}
        onClick={onToggleDone}
      >
        <Check size={20} />
      </button>
    </div>
  )
}
