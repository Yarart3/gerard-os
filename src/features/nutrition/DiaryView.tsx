import { useMemo, useState } from 'react'
import { Card, ListRow, NumberInput, Pill, SearchInput, Sheet, useToast } from '../../components/ui'
import { ChevronLeft, ChevronRight, Plus } from '../../components/ui/icons'
import { addDays, formatLongDate } from '../../lib/dates'
import { formatGrams, formatKcal, formatNumber } from '../../lib/format'
import { matchesQuery } from '../gym/logic/catalog'
import { useGymSettings } from '../gym/gymSettings'
import {
  useAddMealItem,
  useDeleteMealItem,
  useMeals,
  useNutritionMaps,
  useUpdateMealItem,
  type MealItem,
} from './api'
import { foodMacros, mealItemMacros, recipePer100, scaleMacros, sumMacros, type Macros } from './logic/macros'
import { MacroSummary } from './MacroSummary'
import g from '../gym/Gym.module.css'
import n from './Nutrition.module.css'
import { useToday } from '../../lib/useToday'

const macroLine = (m: Macros) =>
  `P ${formatNumber(m.protein, 0)} · C ${formatNumber(m.carbs, 0)} · G ${formatNumber(m.fat, 0)} g`

export function DiaryView() {
  const today = useToday()
  const [date, setDate] = useState(today)
  const { value: cfg } = useGymSettings()
  const targets = cfg.nutrition
  const { data: meals = [], isLoading } = useMeals(date, date)
  const maps = useNutritionMaps()
  const [adding, setAdding] = useState<string | null>(null)
  const [editing, setEditing] = useState<MealItem | null>(null)

  const itemsBySlot = new Map(meals.map((m) => [m.slot, m.meal_items]))
  // Momentos configurados + los que existan en los datos (p. ej. importados con otro nombre)
  const slots = [
    ...new Set([...targets.slots, ...meals.filter((m) => m.meal_items.length).map((m) => m.slot)]),
  ]
  const macrosOf = (it: MealItem) => mealItemMacros(it, maps.foodMap, maps.recipeMap)
  const nameOf = (it: MealItem) =>
    (it.food_id ? maps.foodMap.get(it.food_id)?.name : maps.recipeMap.get(it.recipe_id ?? '')?.name) ?? '—'
  const total = sumMacros(meals.flatMap((m) => m.meal_items.map(macrosOf)))

  return (
    <div className={g.stack}>
      <Card>
        <div className={n.dateNav}>
          <button
            type="button"
            className={g.iconBtn}
            aria-label="Día anterior"
            onClick={() => setDate(addDays(date, -1))}
          >
            <ChevronLeft size={22} />
          </button>
          <span className={n.dateLabel}>{date === today ? 'Hoy' : formatLongDate(date)}</span>
          {date !== today ? (
            <button type="button" className={`btn btn-plain ${n.today}`} onClick={() => setDate(today)}>
              Hoy
            </button>
          ) : null}
          <button
            type="button"
            className={g.iconBtn}
            aria-label="Día siguiente"
            onClick={() => setDate(addDays(date, 1))}
          >
            <ChevronRight size={22} />
          </button>
        </div>
      </Card>

      <Card title="Total del día">
        <MacroSummary totals={total} targets={targets} caption="Día" />
      </Card>

      {isLoading || maps.isLoading ? (
        <p className={g.muted}>Cargando…</p>
      ) : (
        slots.map((slot) => {
          const items = itemsBySlot.get(slot) ?? []
          const kcal = sumMacros(items.map(macrosOf)).kcal
          return (
            <Card
              key={slot}
              flush
              title={slot}
              action={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {items.length > 0 && <span className={n.slotKcal}>{formatKcal(kcal)}</span>}
                  <button
                    type="button"
                    className={n.addBtn}
                    onClick={() => setAdding(slot)}
                    aria-label={`Añadir a ${slot}`}
                  >
                    <Plus size={20} />
                  </button>
                </span>
              }
            >
              {items.length ? (
                items.map((it) => (
                  <ListRow
                    key={it.id}
                    title={nameOf(it)}
                    subtitle={`${formatGrams(it.grams)} · ${macroLine(macrosOf(it))}`}
                    value={formatKcal(macrosOf(it).kcal)}
                    onClick={() => setEditing(it)}
                  />
                ))
              ) : (
                <p className={g.muted} style={{ padding: '0 16px 16px' }}>
                  Nada apuntado.
                </p>
              )}
            </Card>
          )
        })
      )}

      {adding && <AddItemSheet date={date} slot={adding} onClose={() => setAdding(null)} />}
      {editing && (
        <EditItemSheet
          item={editing}
          name={nameOf(editing)}
          perGram={macrosOf({ ...editing, grams: 1 })}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

type Pickable = { kind: 'food' | 'recipe'; id: string; name: string; per100: Macros }

function AddItemSheet({ date, slot, onClose }: { date: string; slot: string; onClose: () => void }) {
  const maps = useNutritionMaps()
  const add = useAddMealItem()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<Pickable | null>(null)
  const [grams, setGrams] = useState<number | null>(100)

  const options = useMemo<Pickable[]>(
    () => [
      ...maps.recipes.map((r) => ({
        kind: 'recipe' as const,
        id: r.id,
        name: r.name,
        per100: recipePer100(maps.recipeMap.get(r.id)!, maps.foodMap),
      })),
      ...maps.foods.map((f) => ({ kind: 'food' as const, id: f.id, name: f.name, per100: f })),
    ],
    [maps],
  )
  const list = options.filter((o) => matchesQuery(o, q)).slice(0, 60)

  const save = async () => {
    if (!picked || !grams) return
    try {
      await add.mutateAsync({
        date,
        slot,
        grams,
        ...(picked.kind === 'food' ? { food_id: picked.id } : { recipe_id: picked.id }),
      })
      toast(`Añadido a ${slot}`)
      onClose()
    } catch {
      toast('No se ha podido añadir', 'error')
    }
  }

  return (
    <Sheet open onClose={onClose} title={`Añadir a ${slot}`}>
      {picked ? (
        <>
          <Card title={picked.name}>
            <label className="field">
              <span className="field-label">Cantidad (g)</span>
              <NumberInput decimals={1} value={grams} onCommit={setGrams} autoFocus />
            </label>
            {grams ? (
              <p className={g.muted} style={{ marginTop: 12 }}>
                {formatKcal(foodMacros(picked.per100, grams).kcal)} ·{' '}
                {macroLine(foodMacros(picked.per100, grams))}
              </p>
            ) : null}
          </Card>
          <button type="button" className="btn btn-primary" disabled={!grams || add.isPending} onClick={save}>
            Añadir
          </button>
          <button type="button" className="btn btn-plain" onClick={() => setPicked(null)}>
            Elegir otro
          </button>
        </>
      ) : (
        <>
          <SearchInput value={q} onChange={setQ} label="Buscar alimento o receta" />
          <Card flush>
            {list.map((o) => (
              <ListRow
                key={`${o.kind}:${o.id}`}
                title={o.name}
                subtitle={`${formatKcal(o.per100.kcal)} / 100 g`}
                value={o.kind === 'recipe' ? <Pill tone="accent">Receta</Pill> : undefined}
                onClick={() => setPicked(o)}
              />
            ))}
            {!list.length && (
              <p className={g.muted} style={{ padding: 16 }}>
                {options.length ? 'Sin resultados.' : 'Crea alimentos en la pestaña Alimentos.'}
              </p>
            )}
          </Card>
        </>
      )}
    </Sheet>
  )
}

function EditItemSheet({
  item,
  name,
  perGram,
  onClose,
}: {
  item: MealItem
  name: string
  perGram: Macros
  onClose: () => void
}) {
  const update = useUpdateMealItem()
  const del = useDeleteMealItem()
  const toast = useToast()
  const [grams, setGrams] = useState<number | null>(item.grams)
  const run = async (p: Promise<unknown>, msg: string) => {
    try {
      await p
      toast(msg)
      onClose()
    } catch {
      toast('No se ha podido guardar', 'error')
    }
  }
  return (
    <Sheet open onClose={onClose} title={name}>
      <Card>
        <label className="field">
          <span className="field-label">Cantidad (g)</span>
          <NumberInput decimals={1} value={grams} onCommit={setGrams} />
        </label>
        {grams ? (
          <p className={g.muted} style={{ marginTop: 12 }}>
            {formatKcal(perGram.kcal * grams)} · {macroLine(scaleMacros(perGram, grams))}
          </p>
        ) : null}
      </Card>
      <button
        type="button"
        className="btn btn-primary"
        disabled={!grams || update.isPending}
        onClick={() => grams && run(update.mutateAsync({ id: item.id, grams }), 'Guardado')}
      >
        Guardar
      </button>
      <button
        type="button"
        className="btn btn-plain"
        style={{ color: 'var(--danger)' }}
        onClick={() => run(del.mutateAsync(item.id), 'Eliminado')}
      >
        Quitar de la comida
      </button>
    </Sheet>
  )
}
