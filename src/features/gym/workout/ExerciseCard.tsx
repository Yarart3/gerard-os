import { Card } from '../../../components/ui'
import { ArrowDown, ArrowUp, Plus, Trash } from '../../../components/ui/icons'
import {
  useAddSet,
  useDeleteItem,
  useDeleteSet,
  useUpdateItem,
  useUpdateSet,
  type Exercise,
  type WorkoutItem,
} from '../api'
import { useBodyWeight, useGymSettings } from '../gymSettings'
import { bodyweightTotal, usesBodyweight, withBodyweight } from '../logic/bodyweight'
import { nextSet } from '../logic/sets'
import { isExerciseUnit, TYPE_LABEL, type ExerciseType, type SetValues } from '../logic/types'
import { formatSet, formatWeight, SET_HEADERS } from '../logic/display'
import { SetRow } from './SetRow'
import s from '../Gym.module.css'

type Props = {
  item: WorkoutItem
  exercise: Exercise | undefined
  canUp: boolean
  canDown: boolean
  onMove: (dir: -1 | 1) => void
  onSetDone: () => void
  /** Series de la última vez que hiciste este ejercicio (columna «Anterior»). */
  previous?: readonly SetValues[]
}

export function ExerciseCard({ item, exercise, canUp, canDown, onMove, onSetDone, previous = [] }: Props) {
  const { value: cfg } = useGymSettings()
  const updateSet = useUpdateSet()
  const addSet = useAddSet()
  const deleteSet = useDeleteSet()
  const deleteItem = useDeleteItem()
  const updateItem = useUpdateItem()
  const unit = exercise && isExerciseUnit(exercise.unit) ? exercise.unit : 'reps'
  const name = exercise?.name ?? 'Ejercicio'
  const done = item.sets.filter((x) => x.done).length
  const bodyKg = useBodyWeight()
  const bw = usesBodyweight(exercise) ? { kg: bodyKg } : null
  const headers = bw ? ['Lastre', 'Repes'] : SET_HEADERS[unit]

  return (
    <Card>
      <div className={s.exHeader}>
        <h3 className={s.exTitle}>
          {name}
          <span className={s.exMeta}>
            {[
              exercise && TYPE_LABEL[exercise.type as ExerciseType],
              exercise?.muscle_group,
              bw &&
                (bw.kg === null
                  ? 'Peso corporal: ponlo en Ajustes'
                  : `Peso corporal ${formatWeight(bw.kg, cfg.weight_unit)}`),
              `${done}/${item.sets.length} series`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </h3>
        <button
          type="button"
          className={s.iconBtn}
          aria-label={`Subir ${name}`}
          disabled={!canUp}
          onClick={() => onMove(-1)}
        >
          <ArrowUp size={20} />
        </button>
        <button
          type="button"
          className={s.iconBtn}
          aria-label={`Bajar ${name}`}
          disabled={!canDown}
          onClick={() => onMove(1)}
        >
          <ArrowDown size={20} />
        </button>
        <button
          type="button"
          className={`${s.iconBtn} ${s.danger}`}
          aria-label={`Quitar ${name} de la sesión`}
          onClick={() => {
            if (confirm(`¿Quitar ${name} y sus series de la sesión?`)) deleteItem.mutate(item.id)
          }}
        >
          <Trash size={20} />
        </button>
      </div>
      <textarea
        key={`${item.id}:${item.notes ?? ''}`}
        className={s.exNote}
        rows={1}
        aria-label={`Nota de ${name}`}
        placeholder="Añadir nota…"
        defaultValue={item.notes ?? ''}
        onBlur={(e) => {
          const v = e.target.value.trim() || null
          if (v !== item.notes) updateItem.mutate({ id: item.id, patch: { notes: v } })
        }}
      />
      <div className={s.setHead} aria-hidden="true">
        <span>#</span>
        <span className={s.setFields}>
          {headers.map((h) => (
            <span key={h} style={{ textAlign: 'center' }}>
              {h}
            </span>
          ))}
        </span>
        <span />
      </div>
      {item.sets.map((set, i) => (
        <SetRow
          key={set.id}
          index={i}
          set={set}
          unit={unit}
          weightUnit={cfg.weight_unit}
          increment={cfg.weight_increment}
          exerciseName={name}
          bodyweight={bw}
          previous={previous[i] ? formatSet(unit, previous[i], cfg.weight_unit) : null}
          onChange={(patch) => updateSet.mutate({ id: set.id, patch })}
          onToggleDone={() => {
            // Al marcarla, la carga total se fija con el peso corporal de hoy.
            const total = bw && !set.done ? bodyweightTotal(bw.kg, set.added_kg) : undefined
            updateSet.mutate({
              id: set.id,
              patch: {
                done: !set.done,
                ...(bw && !set.done ? { added_kg: set.added_kg ?? 0, weight_kg: total ?? null } : {}),
              },
            })
            if (!set.done) onSetDone()
          }}
        />
      ))}
      <div className={s.exFooter}>
        <button
          type="button"
          className="btn btn-plain"
          disabled={addSet.isPending}
          onClick={() =>
            addSet.mutate({
              ...(bw ? withBodyweight(nextSet(item.sets), bw.kg) : nextSet(item.sets)),
              item_id: item.id,
              position: (item.sets.at(-1)?.position ?? -1) + 1,
            })
          }
        >
          <Plus size={18} /> Serie
        </button>
        {item.sets.length > 0 && (
          <button
            type="button"
            className="btn btn-plain"
            style={{ color: 'var(--muted)' }}
            onClick={() => {
              const last = item.sets.at(-1)
              if (last) deleteSet.mutate(last.id)
            }}
          >
            Quitar última
          </button>
        )}
      </div>
    </Card>
  )
}
