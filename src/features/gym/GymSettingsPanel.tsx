import { useState } from 'react'
import { Card, NumberInput, SegmentedControl, useToast } from '../../components/ui'
import { Close, Plus } from '../../components/ui/icons'
import { formatDuration, parseDuration } from '../../lib/format'
import { useGeneralSettings } from '../settings/useSettings'
import { useGymSettings, type GymSettings } from './gymSettings'
import { EXERCISE_TYPES, TYPE_LABEL } from './logic/types'
import { kcalFromMacros } from '../nutrition/logic/macros'
import { formatNumber } from '../../lib/format'
import s from './Gym.module.css'

const UNITS = [
  { value: 'kg', label: 'Kilos (kg)' },
  { value: 'lb', label: 'Libras (lb)' },
] as const

/** Lista editable de textos (grupos musculares, comidas del día). */
function TextList({
  items,
  onChange,
  label,
}: {
  items: string[]
  onChange: (v: string[]) => void
  label: string
}) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const v = draft.trim()
    if (v && !items.includes(v)) onChange([...items, v])
    setDraft('')
  }
  return (
    <div className={s.stack} style={{ gap: 10 }}>
      <div className={s.tags}>
        {items.map((it) => (
          <span key={it} className={s.tagBtn}>
            {it}
            <button
              type="button"
              className={s.iconBtn}
              style={{ width: 32, height: 36 }}
              aria-label={`Quitar ${it}`}
              onClick={() => onChange(items.filter((x) => x !== it))}
            >
              <Close size={14} />
            </button>
          </span>
        ))}
      </div>
      <div className={s.inline}>
        <input
          className="input"
          aria-label={label}
          placeholder={label}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <button type="button" className={`btn ${s.accentBtn}`} onClick={add} aria-label={`Añadir: ${label}`}>
          <Plus size={20} />
        </button>
      </div>
    </div>
  )
}

/** Ajustes de Gym (CLAUDE.md §8) dentro del Sheet de la rueda. */
export default function GymSettingsPanel() {
  const gym = useGymSettings()
  const general = useGeneralSettings()
  if (gym.isLoading || general.isLoading) return <p className={s.muted}>Cargando…</p>
  return <Form key={JSON.stringify([gym.value, general.value.profile.weight_kg])} />
}

function Form() {
  const gym = useGymSettings()
  const general = useGeneralSettings()
  const toast = useToast()
  const [v, setV] = useState<GymSettings>(gym.value)
  const [weight, setWeight] = useState(general.value.profile.weight_kg)
  const [rest, setRest] = useState(formatDuration(gym.value.rest_seconds))
  const set = <K extends keyof GymSettings>(k: K, val: GymSettings[K]) => setV((p) => ({ ...p, [k]: val }))
  const setNut = (k: keyof GymSettings['nutrition'], val: number | string[]) =>
    setV((p) => ({ ...p, nutrition: { ...p.nutrition, [k]: val } }))

  const save = async () => {
    try {
      const restSeconds = parseDuration(rest) ?? v.rest_seconds
      await gym.save({ ...v, rest_seconds: restSeconds })
      if (weight !== general.value.profile.weight_kg)
        await general.save({ ...general.value, profile: { ...general.value.profile, weight_kg: weight } })
      toast('Ajustes de Gym guardados')
    } catch {
      toast('No se han podido guardar', 'error')
    }
  }

  const n = v.nutrition
  const fromMacros = kcalFromMacros(n.protein, n.carbs, n.fat)

  return (
    <>
      <Card title="Entreno">
        <div className={s.form}>
          <div className={`field ${s.full}`}>
            <span className="field-label">Unidades de peso</span>
            <SegmentedControl
              label="Unidades de peso"
              options={UNITS}
              value={v.weight_unit}
              onChange={(u) => set('weight_unit', u)}
            />
          </div>
          <label className="field">
            <span className="field-label">Incremento ({v.weight_unit})</span>
            <NumberInput
              value={v.weight_increment}
              onCommit={(x) => set('weight_increment', x && x > 0 ? x : 2.5)}
            />
          </label>
          <label className="field">
            <span className="field-label">Descanso (m:ss)</span>
            <input
              className="input"
              inputMode="numeric"
              value={rest}
              onChange={(e) => setRest(e.target.value)}
            />
          </label>
        </div>
      </Card>

      <Card title="Calorías">
        <div className={s.form}>
          <label className={`field ${s.full}`}>
            <span className="field-label">Peso corporal (kg) · se comparte con tu perfil</span>
            <NumberInput value={weight} onCommit={setWeight} placeholder="0,0" />
          </label>
          {EXERCISE_TYPES.map((t) => (
            <label key={t} className="field">
              <span className="field-label">MET {TYPE_LABEL[t].toLowerCase()}</span>
              <NumberInput
                decimals={1}
                value={v.met[t]}
                onCommit={(x) => set('met', { ...v.met, [t]: x && x > 0 ? x : gym.value.met[t] })}
              />
            </label>
          ))}
          <p className={`${s.small} ${s.full}`} style={{ margin: 0 }}>
            kcal = MET × 3,5 × peso / 200 × minutos. Cada ejercicio puede tener su propio MET en el Catálogo.
          </p>
        </div>
      </Card>

      <Card title="Tipos y grupos musculares">
        <p className={s.small} style={{ margin: '0 0 10px' }}>
          Tipos (fijos): {EXERCISE_TYPES.map((t) => TYPE_LABEL[t]).join(', ')}.
        </p>
        <TextList
          items={v.muscle_groups}
          onChange={(x) => set('muscle_groups', x)}
          label="Nuevo grupo muscular"
        />
      </Card>

      <Card title="Nutrición">
        <div className={s.form}>
          <label className={`field ${s.full}`}>
            <span className="field-label">Objetivo diario (kcal)</span>
            <NumberInput decimals={0} value={n.kcal} onCommit={(x) => setNut('kcal', x ?? 0)} />
          </label>
          <label className="field">
            <span className="field-label">Proteína (g)</span>
            <NumberInput decimals={0} value={n.protein} onCommit={(x) => setNut('protein', x ?? 0)} />
          </label>
          <label className="field">
            <span className="field-label">Carbohidratos (g)</span>
            <NumberInput decimals={0} value={n.carbs} onCommit={(x) => setNut('carbs', x ?? 0)} />
          </label>
          <label className="field">
            <span className="field-label">Grasa (g)</span>
            <NumberInput decimals={0} value={n.fat} onCommit={(x) => setNut('fat', x ?? 0)} />
          </label>
          <label className="field">
            <span className="field-label">Fibra (g)</span>
            <NumberInput decimals={0} value={n.fiber} onCommit={(x) => setNut('fiber', x ?? 0)} />
          </label>
          <p className={`${s.small} ${s.full}`} style={{ margin: 0 }}>
            Los macros suman {formatNumber(fromMacros, 0)} kcal (4/4/9).
          </p>
          <div className={`field ${s.full}`}>
            <span className="field-label">Comidas del día</span>
            <TextList items={n.slots} onChange={(x) => setNut('slots', x)} label="Nueva comida" />
          </div>
        </div>
      </Card>

      <button
        type="button"
        className="btn btn-primary"
        onClick={save}
        disabled={gym.saving || general.saving}
      >
        Guardar ajustes de Gym
      </button>
    </>
  )
}
