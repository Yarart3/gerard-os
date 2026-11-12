import { Card } from '../../../components/ui'
import { ArrowDown, ArrowUp, Plus, Trash } from '../../../components/ui/icons'
import { useAddSet, useDeleteItem, useDeleteSet, useUpdateSet, type Exercise, type WorkoutItem } from '../api'
import { useGymSettings } from '../gymSettings'
import { nextSet } from '../logic/sets'
import { isExerciseUnit, TYPE_LABEL, type ExerciseType } from '../logic/types'
import { SET_HEADERS } from '../logic/display'
import { SetRow } from './SetRow'
import s from '../Gym.module.css'

type Props = {
  item: WorkoutItem
  exercise: Exercise | undefined
  canUp: boolean
  canDown: boolean
  onMove: (dir: -1 | 1) => void
  onSetDone: () => void
}

export function ExerciseCard({ item, exercise, canUp, canDown, onMove, onSetDone }: Props) {
  const { value: cfg } = useGymSettings()
  const updateSet = useUpdateSet()
  const addSet = useAddSet()
  const deleteSet = useDeleteSet()
  const deleteItem = useDeleteItem()
  const unit = exercise && isExerciseUnit(exercise.unit) ? exercise.unit : 'reps'
  const name = exercise?.name ?? 'Ejercicio'
  const done = item.sets.filter((x) => x.done).length

  return (
    <Card>
      <div className={s.exHeader}>
        <h3 className={s.exTitle}>
          {name}
          <span className={s.exMeta}>
            {[
              exercise && TYPE_LABEL[exercise.type as ExerciseType],
              exercise?.muscle_group,
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
      <div className={s.setHead} aria-hidden="true">
        <span>#</span>
        <span className={s.setFields}>
          {SET_HEADERS[unit].map((h) => (
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
          onChange={(patch) => updateSet.mutate({ id: set.id, patch })}
          onToggleDone={() => {
            updateSet.mutate({ id: set.id, patch: { done: !set.done } })
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
              ...nextSet(item.sets),
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
