import { useState, type FormEvent } from 'react'
import { NumberInput, SegmentedControl, Sheet, useToast } from '../../../components/ui'
import { formatNumber } from '../../../lib/format'
import { useDeleteExercise, useSaveExercise, type Exercise } from '../api'
import { useGymSettings } from '../gymSettings'
import { looksBodyweight } from '../logic/bodyweight'
import { parseAliases } from '../logic/catalog'
import {
  EXERCISE_TYPES,
  EXERCISE_UNITS,
  isExerciseType,
  isExerciseUnit,
  TYPE_LABEL,
  UNIT_LABEL,
  type ExerciseType,
  type ExerciseUnit,
} from '../logic/types'
import s from '../Gym.module.css'

const TYPE_OPTIONS = EXERCISE_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))
// Unidad por defecto al cambiar de tipo (si el usuario no la ha tocado)
const UNIT_FOR_TYPE: Record<ExerciseType, ExerciseUnit> = {
  strength: 'kg',
  gymnastics: 'reps',
  metcon: 'reps',
  cardio: 'meters',
}

type Props = { exercise: Exercise | 'new' | null; onClose: () => void }

export function ExerciseFormSheet({ exercise, onClose }: Props) {
  if (!exercise) return null
  return (
    <Sheet open onClose={onClose} title={exercise === 'new' ? 'Nuevo ejercicio' : 'Editar ejercicio'}>
      <ExerciseForm exercise={exercise === 'new' ? null : exercise} onDone={onClose} />
    </Sheet>
  )
}

function ExerciseForm({ exercise, onDone }: { exercise: Exercise | null; onDone: () => void }) {
  const { value: cfg } = useGymSettings()
  const save = useSaveExercise()
  const del = useDeleteExercise()
  const toast = useToast()
  const [name, setName] = useState(exercise?.name ?? '')
  const [aliases, setAliases] = useState(exercise?.aliases.join(', ') ?? '')
  const [group, setGroup] = useState(exercise?.muscle_group ?? '')
  const [type, setType] = useState<ExerciseType>(
    exercise && isExerciseType(exercise.type) ? exercise.type : 'strength',
  )
  const [unit, setUnit] = useState<ExerciseUnit>(
    exercise && isExerciseUnit(exercise.unit) ? exercise.unit : 'kg',
  )
  const [unitTouched, setUnitTouched] = useState(Boolean(exercise))
  const [met, setMet] = useState<number | null>(exercise?.met ?? null)
  const [archived, setArchived] = useState(exercise?.archived ?? false)
  // null = automático (según el nombre y los alias)
  const [bodyweight, setBodyweight] = useState<boolean | null>(exercise?.bodyweight ?? null)
  const autoBw = looksBodyweight(name, parseAliases(aliases))
  const bwApplies = unit === 'kg' || unit === 'reps'
  const groups = [...new Set([...cfg.muscle_groups, ...(group ? [group] : [])])]

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await save.mutateAsync({
        ...(exercise ? { id: exercise.id } : {}),
        name: name.trim(),
        aliases: parseAliases(aliases),
        muscle_group: group || null,
        type,
        unit,
        met,
        archived,
        bodyweight,
      })
      toast(exercise ? 'Ejercicio guardado' : 'Ejercicio creado')
      onDone()
    } catch (err) {
      const dup = err instanceof Error && /duplicate|unique/i.test(err.message)
      toast(dup ? 'Ya existe un ejercicio con ese nombre' : 'No se ha podido guardar', 'error')
    }
  }

  const remove = async () => {
    if (!exercise || !confirm(`¿Eliminar «${exercise.name}»?`)) return
    try {
      await del.mutateAsync(exercise.id)
      toast('Ejercicio eliminado')
      onDone()
    } catch (err) {
      toast(
        err instanceof Error && err.message === 'in-use'
          ? 'Tiene sesiones registradas: archívalo en lugar de borrarlo'
          : 'No se ha podido eliminar',
        'error',
      )
    }
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <label className={`field ${s.full}`}>
        <span className="field-label">Nombre</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className={`field ${s.full}`}>
        <span className="field-label">Alias (separados por comas)</span>
        <input
          className="input"
          value={aliases}
          onChange={(e) => setAliases(e.target.value)}
          placeholder="Pull-up, Dominadas"
        />
      </label>
      <div className={`field ${s.full}`}>
        <span className="field-label">Tipo</span>
        <SegmentedControl
          label="Tipo"
          options={TYPE_OPTIONS}
          value={type}
          onChange={(t) => {
            setType(t)
            if (!unitTouched) setUnit(UNIT_FOR_TYPE[t])
          }}
        />
      </div>
      <label className="field">
        <span className="field-label">Grupo muscular</span>
        <select className={`input ${s.select}`} value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">—</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field-label">Unidad</span>
        <select
          className={`input ${s.select}`}
          value={unit}
          onChange={(e) => {
            if (isExerciseUnit(e.target.value)) setUnit(e.target.value)
            setUnitTouched(true)
          }}
        >
          {EXERCISE_UNITS.map((u) => (
            <option key={u} value={u}>
              {UNIT_LABEL[u]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field-label">MET</span>
        <NumberInput
          decimals={1}
          value={met}
          onCommit={setMet}
          placeholder={`${formatNumber(cfg.met[type], 1)} (por tipo)`}
        />
      </label>
      {bwApplies && (
        <label className="field">
          <span className="field-label">Peso corporal</span>
          <select
            className={`input ${s.select}`}
            value={bodyweight === null ? 'auto' : bodyweight ? 'yes' : 'no'}
            onChange={(e) => setBodyweight(e.target.value === 'auto' ? null : e.target.value === 'yes')}
          >
            <option value="auto">Automático ({autoBw ? 'sí' : 'no'})</option>
            <option value="yes">Sí: peso corporal + lastre</option>
            <option value="no">No</option>
          </select>
        </label>
      )}
      <label className={s.checkRow}>
        <input
          type="checkbox"
          className={s.checkbox}
          checked={archived}
          onChange={(e) => setArchived(e.target.checked)}
        />
        Archivado
      </label>
      <div className={s.full}>
        <button className="btn btn-primary" disabled={save.isPending || !name.trim()}>
          Guardar
        </button>
      </div>
      {exercise && (
        <div className={s.full} style={{ display: 'flex', justifyContent: 'center' }}>
          <button type="button" className="btn btn-plain" style={{ color: 'var(--danger)' }} onClick={remove}>
            Eliminar ejercicio
          </button>
        </div>
      )}
    </form>
  )
}
