import { useMemo, useState } from 'react'
import { Card, ChipScroller, EmptyState, ListRow, SearchInput } from '../../../components/ui'
import { Plus } from '../../../components/ui/icons'
import { formatNumber } from '../../../lib/format'
import { useExercises, type Exercise } from '../api'
import { useGymSettings } from '../gymSettings'
import { matchesQuery } from '../logic/catalog'
import { exerciseMet } from '../logic/met'
import { EXERCISE_TYPES, TYPE_LABEL, UNIT_LABEL, type ExerciseType, type ExerciseUnit } from '../logic/types'
import { ExerciseFormSheet } from './ExerciseForm'
import s from '../Gym.module.css'

type Filter = 'all' | ExerciseType | 'archived'
const FILTERS = [
  { value: 'all', label: 'Todos' },
  ...EXERCISE_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] })),
  { value: 'archived', label: 'Archivados' },
] as const satisfies readonly { value: Filter; label: string }[]

export function CatalogTab() {
  const { data = [], isLoading } = useExercises()
  const { value: cfg } = useGymSettings()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null)

  const list = useMemo(
    () =>
      data.filter(
        (e) =>
          matchesQuery(e, q) &&
          (filter === 'archived' ? e.archived : !e.archived && (filter === 'all' || e.type === filter)),
      ),
    [data, q, filter],
  )

  return (
    <div className={s.stack}>
      <div className={s.inline}>
        <div style={{ flex: 1 }}>
          <SearchInput value={q} onChange={setQ} label="Buscar en el catálogo" />
        </div>
        <button type="button" className={`btn ${s.accentBtn}`} onClick={() => setEditing('new')}>
          <Plus size={20} /> Nuevo
        </button>
      </div>
      <ChipScroller label="Filtrar por tipo" options={FILTERS} value={filter} onChange={setFilter} />
      <Card flush>
        {isLoading ? (
          <p className={s.muted} style={{ padding: 16 }}>
            Cargando…
          </p>
        ) : list.length ? (
          list.map((e) => (
            <ListRow
              key={e.id}
              title={e.name}
              subtitle={[
                TYPE_LABEL[e.type as ExerciseType],
                e.muscle_group,
                UNIT_LABEL[e.unit as ExerciseUnit],
              ]
                .filter(Boolean)
                .join(' · ')}
              value={`MET ${formatNumber(exerciseMet(e, cfg.met), 1)}`}
              onClick={() => setEditing(e)}
            />
          ))
        ) : (
          <EmptyState
            title={data.length ? 'Sin resultados' : 'Catálogo vacío'}
            text={
              data.length
                ? 'Prueba con otro nombre o filtro.'
                : 'Crea tus ejercicios o pega un WOD en Entreno.'
            }
          />
        )}
      </Card>
      <ExerciseFormSheet exercise={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
