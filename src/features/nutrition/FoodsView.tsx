import { useState, type FormEvent } from 'react'
import { Card, EmptyState, ListRow, NumberInput, SearchInput, Sheet, useToast } from '../../components/ui'
import { Plus } from '../../components/ui/icons'
import { formatKcal, formatNumber } from '../../lib/format'
import { matchesQuery } from '../gym/logic/catalog'
import { useDeleteFood, useFoods, useSaveFood, type Food } from './api'
import g from '../gym/Gym.module.css'

export function FoodsView() {
  const { data = [], isLoading } = useFoods()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Food | 'new' | null>(null)
  const list = data.filter((f) => matchesQuery(f, q))
  return (
    <div className={g.stack}>
      <div className={g.inline}>
        <div style={{ flex: 1 }}>
          <SearchInput value={q} onChange={setQ} label="Buscar alimento" />
        </div>
        <button type="button" className={`btn ${g.accentBtn}`} onClick={() => setEditing('new')}>
          <Plus size={20} /> Nuevo
        </button>
      </div>
      <Card flush>
        {isLoading ? (
          <p className={g.muted} style={{ padding: 16 }}>
            Cargando…
          </p>
        ) : list.length ? (
          list.map((f) => (
            <ListRow
              key={f.id}
              title={f.name}
              subtitle={`P ${formatNumber(f.protein, 1)} · C ${formatNumber(f.carbs, 1)} · G ${formatNumber(f.fat, 1)} · F ${formatNumber(f.fiber, 1)} g`}
              value={formatKcal(f.kcal)}
              onClick={() => setEditing(f)}
            />
          ))
        ) : (
          <EmptyState
            title={data.length ? 'Sin resultados' : 'Sin alimentos'}
            text={
              data.length
                ? 'Prueba con otro nombre.'
                : 'Añade alimentos con sus macros por 100 g o importa el Excel.'
            }
          />
        )}
      </Card>
      {editing && (
        <Sheet
          open
          onClose={() => setEditing(null)}
          title={editing === 'new' ? 'Nuevo alimento' : 'Editar alimento'}
        >
          <FoodForm food={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />
        </Sheet>
      )}
    </div>
  )
}

const FIELDS = [
  ['kcal', 'Calorías (kcal)'],
  ['protein', 'Proteína (g)'],
  ['carbs', 'Carbohidratos (g)'],
  ['fat', 'Grasa (g)'],
  ['fiber', 'Fibra (g)'],
] as const

function FoodForm({ food, onDone }: { food: Food | null; onDone: () => void }) {
  const save = useSaveFood()
  const del = useDeleteFood()
  const toast = useToast()
  const [name, setName] = useState(food?.name ?? '')
  const [values, setValues] = useState({
    kcal: food?.kcal ?? null,
    protein: food?.protein ?? null,
    carbs: food?.carbs ?? null,
    fat: food?.fat ?? null,
    fiber: food?.fiber ?? null,
  } as Record<(typeof FIELDS)[number][0], number | null>)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await save.mutateAsync({
        ...(food ? { id: food.id } : {}),
        name: name.replace(/\s+/g, ' ').trim(),
        kcal: values.kcal ?? 0,
        protein: values.protein ?? 0,
        carbs: values.carbs ?? 0,
        fat: values.fat ?? 0,
        fiber: values.fiber ?? 0,
      })
      toast('Alimento guardado')
      onDone()
    } catch (err) {
      toast(
        err instanceof Error && err.message === 'duplicate'
          ? 'Ya existe ese alimento'
          : 'No se ha podido guardar',
        'error',
      )
    }
  }
  const remove = async () => {
    if (!food || !confirm(`¿Eliminar «${food.name}»?`)) return
    try {
      await del.mutateAsync(food.id)
      toast('Alimento eliminado')
      onDone()
    } catch (err) {
      toast(
        err instanceof Error && err.message === 'in-use'
          ? 'Se usa en recetas o comidas: no se puede eliminar'
          : 'No se ha podido eliminar',
        'error',
      )
    }
  }

  return (
    <form className={g.form} onSubmit={submit}>
      <label className={`field ${g.full}`}>
        <span className="field-label">Nombre</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <p className={`${g.small} ${g.full}`} style={{ margin: 0 }}>
        Valores por 100 g
      </p>
      {FIELDS.map(([key, label]) => (
        <label key={key} className="field">
          <span className="field-label">{label}</span>
          <NumberInput
            decimals={2}
            placeholder="0"
            value={values[key]}
            onCommit={(v) => setValues((prev) => ({ ...prev, [key]: v }))}
          />
        </label>
      ))}
      <div className={g.full}>
        <button className="btn btn-primary" disabled={save.isPending || !name.trim()}>
          Guardar
        </button>
      </div>
      {food && (
        <div className={g.full} style={{ display: 'flex', justifyContent: 'center' }}>
          <button type="button" className="btn btn-plain" style={{ color: 'var(--danger)' }} onClick={remove}>
            Eliminar alimento
          </button>
        </div>
      )}
    </form>
  )
}
