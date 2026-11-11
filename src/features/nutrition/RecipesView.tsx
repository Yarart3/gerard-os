import { useState, type FormEvent } from 'react'
import { Card, EmptyState, ListRow, NumberInput, Sheet, useToast } from '../../components/ui'
import { Plus, Trash } from '../../components/ui/icons'
import { formatGrams, formatKcal, formatNumber } from '../../lib/format'
import { useDeleteRecipe, useNutritionMaps, useSaveRecipe, type Recipe } from './api'
import { recipeTotals, scaleMacros, type Macros } from './logic/macros'
import g from '../gym/Gym.module.css'
import n from './Nutrition.module.css'

export function RecipesView() {
  const maps = useNutritionMaps()
  const [editing, setEditing] = useState<Recipe | 'new' | null>(null)
  return (
    <div className={g.stack}>
      <div className={g.actions}>
        <button type="button" className={`btn ${g.accentBtn}`} onClick={() => setEditing('new')}>
          <Plus size={20} /> Nueva receta
        </button>
      </div>
      <Card flush>
        {maps.isLoading ? (
          <p className={g.muted} style={{ padding: 16 }}>
            Cargando…
          </p>
        ) : maps.recipes.length ? (
          maps.recipes.map((r) => {
            const { total, grams } = recipeTotals({ id: r.id, items: r.recipe_items }, maps.foodMap)
            return (
              <ListRow
                key={r.id}
                title={r.name}
                subtitle={`${r.recipe_items.length} ingredientes · ${formatGrams(grams)}`}
                value={formatKcal(total.kcal)}
                onClick={() => setEditing(r)}
              />
            )
          })
        ) : (
          <EmptyState
            title="Sin recetas"
            text="Crea recetas con ingredientes en gramos y sus macros se calculan solos."
          />
        )}
      </Card>
      {editing && (
        <Sheet
          open
          onClose={() => setEditing(null)}
          title={editing === 'new' ? 'Nueva receta' : 'Editar receta'}
        >
          <RecipeForm recipe={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />
        </Sheet>
      )}
    </div>
  )
}

function Totals({ m, title }: { m: Macros; title: string }) {
  return (
    <div>
      <p className={g.small} style={{ margin: '0 0 6px' }}>
        {title}
      </p>
      <div className={n.totals}>
        <span>
          <strong>{formatNumber(Math.round(m.kcal), 0)}</strong>kcal
        </span>
        <span>
          <strong>{formatNumber(m.protein, 1)}</strong>Prot.
        </span>
        <span>
          <strong>{formatNumber(m.carbs, 1)}</strong>Carb.
        </span>
        <span>
          <strong>{formatNumber(m.fat, 1)}</strong>Grasa
        </span>
        <span>
          <strong>{formatNumber(m.fiber, 1)}</strong>Fibra
        </span>
      </div>
    </div>
  )
}

function RecipeForm({ recipe, onDone }: { recipe: Recipe | null; onDone: () => void }) {
  const maps = useNutritionMaps()
  const save = useSaveRecipe()
  const del = useDeleteRecipe()
  const toast = useToast()
  const [name, setName] = useState(recipe?.name ?? '')
  const [notes, setNotes] = useState(recipe?.notes ?? '')
  const [items, setItems] = useState(
    (recipe?.recipe_items ?? []).map((i) => ({
      key: i.id,
      food_id: i.food_id,
      grams: i.grams as number | null,
    })),
  )
  const [newFood, setNewFood] = useState('')

  const valid = items.filter((i): i is { key: string; food_id: string; grams: number } =>
    Boolean(i.grams && i.grams > 0),
  )
  const { total, grams } = recipeTotals({ id: 'draft', items: valid }, maps.foodMap)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await save.mutateAsync({
        ...(recipe ? { id: recipe.id } : {}),
        name: name.trim(),
        notes: notes.trim() || null,
        items: valid.map(({ food_id, grams }) => ({ food_id, grams })),
      })
      toast('Receta guardada')
      onDone()
    } catch (err) {
      toast(
        err instanceof Error && err.message === 'duplicate'
          ? 'Ya existe esa receta'
          : 'No se ha podido guardar',
        'error',
      )
    }
  }
  const remove = async () => {
    if (!recipe || !confirm(`¿Eliminar «${recipe.name}»?`)) return
    try {
      await del.mutateAsync(recipe.id)
      toast('Receta eliminada')
      onDone()
    } catch (err) {
      toast(
        err instanceof Error && err.message === 'in-use'
          ? 'Está en el registro de comidas: no se puede eliminar'
          : 'No se ha podido eliminar',
        'error',
      )
    }
  }

  return (
    <form className={g.stack} onSubmit={submit}>
      <Card>
        <div className={g.stack} style={{ gap: 12 }}>
          <label className="field">
            <span className="field-label">Nombre</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="field">
            <span className="field-label">Notas</span>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
      </Card>
      <Card title="Ingredientes">
        {items.map((it, i) => {
          const food = maps.foodMap.get(it.food_id)
          return (
            <div key={it.key} className={n.ingredient}>
              <span>
                {food?.name ?? '—'}
                {food && it.grams ? (
                  <span className={g.exMeta}>{formatKcal((food.kcal * it.grams) / 100)}</span>
                ) : null}
              </span>
              <NumberInput
                aria-label={`Gramos de ${food?.name ?? 'ingrediente'}`}
                decimals={1}
                placeholder="g"
                value={it.grams}
                onCommit={(v) => setItems((prev) => prev.map((p, j) => (j === i ? { ...p, grams: v } : p)))}
              />
              <button
                type="button"
                className={`${g.iconBtn} ${g.danger}`}
                aria-label={`Quitar ${food?.name ?? 'ingrediente'}`}
                onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
              >
                <Trash size={20} />
              </button>
            </div>
          )
        })}
        <div className={g.inline} style={{ marginTop: items.length ? 12 : 0 }}>
          <select
            className={`input ${g.select}`}
            aria-label="Alimento a añadir"
            value={newFood}
            onChange={(e) => setNewFood(e.target.value)}
          >
            <option value="">Elegir alimento…</option>
            {maps.foods.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`btn ${g.accentBtn}`}
            disabled={!newFood}
            onClick={() => {
              setItems((prev) => [...prev, { key: crypto.randomUUID(), food_id: newFood, grams: 100 }])
              setNewFood('')
            }}
          >
            <Plus size={18} /> Añadir
          </button>
        </div>
      </Card>
      <Card>
        <div className={g.stack} style={{ gap: 12 }}>
          <Totals m={total} title={`Total (${formatGrams(grams)})`} />
          <Totals m={grams ? scaleMacros(total, 100 / grams) : total} title="Por 100 g" />
        </div>
      </Card>
      <button className="btn btn-primary" disabled={save.isPending || !name.trim()}>
        Guardar
      </button>
      {recipe && (
        <button type="button" className="btn btn-plain" style={{ color: 'var(--danger)' }} onClick={remove}>
          Eliminar receta
        </button>
      )}
    </form>
  )
}
