import { useMemo, useState } from 'react'
import { Card, EmptyState, ListRow, SearchInput, Sheet, useToast } from '../../../components/ui'
import { Plus } from '../../../components/ui/icons'
import { matchesQuery } from '../logic/catalog'
import { useExercises, useSaveExercise, type Exercise } from '../api'
import { normalize } from '../logic/wodMatch'
import { TYPE_LABEL, UNIT_LABEL, type ExerciseType, type ExerciseUnit } from '../logic/types'

type Props = { open: boolean; onClose: () => void; onPick: (exercise: Exercise) => void }

/** Sheet para elegir un ejercicio del catálogo (o crearlo al vuelo). */
export function ExercisePicker({ open, onClose, onPick }: Props) {
  const { data = [] } = useExercises()
  const save = useSaveExercise()
  const toast = useToast()
  const [q, setQ] = useState('')
  const list = useMemo(() => data.filter((e) => !e.archived && matchesQuery(e, q)), [data, q])
  const exact = data.some((e) => normalize(e.name) === normalize(q))

  const pick = (e: Exercise) => {
    onPick(e)
    setQ('')
  }
  const create = async () => {
    try {
      const ex = await save.mutateAsync({ name: q.trim(), type: 'strength', unit: 'kg' })
      toast(`Creado «${ex.name}» (Fuerza, peso y repes). Puedes editarlo en Catálogo.`)
      pick(ex)
    } catch {
      toast('No se ha podido crear', 'error')
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Añadir ejercicio">
      <SearchInput value={q} onChange={setQ} label="Buscar ejercicio" />
      <Card flush>
        {q.trim() && !exact && (
          <ListRow
            icon={<Plus size={20} />}
            title={`Crear «${q.trim()}»`}
            onClick={save.isPending ? undefined : create}
          />
        )}
        {list.map((e) => (
          <ListRow
            key={e.id}
            title={e.name}
            subtitle={[TYPE_LABEL[e.type as ExerciseType], e.muscle_group, UNIT_LABEL[e.unit as ExerciseUnit]]
              .filter(Boolean)
              .join(' · ')}
            onClick={() => pick(e)}
          />
        ))}
        {!list.length && !q.trim() && (
          <EmptyState title="Catálogo vacío" text="Escribe un nombre para crear tu primer ejercicio." />
        )}
      </Card>
    </Sheet>
  )
}
