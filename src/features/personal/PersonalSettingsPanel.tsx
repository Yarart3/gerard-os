import { useState, type FormEvent } from 'react'
import { Card, ListRow, NumberInput, Sheet, useToast } from '../../components/ui'
import { Close, Plus } from '../../components/ui/icons'
import { formatEuros } from '../../lib/format'
import { useCategories, useDeleteCategory, useSaveCategory, type ExpenseCategory } from './api'
import { normalizeTag } from './logic/notes'
import { usePersonalSettings } from './personalSettings'
import { KIND_LABEL, WATCH_KINDS } from './logic/watchlist'
import s from './Personal.module.css'

/** Ajustes de Personal (CLAUDE.md §8) en la página única de Ajustes. */
export default function PersonalSettingsPanel() {
  const toast = useToast()
  const cfg = usePersonalSettings()
  const categories = useCategories()
  const [editing, setEditing] = useState<ExpenseCategory | 'new' | null>(null)
  const [platform, setPlatform] = useState('')
  const [tag, setTag] = useState('')

  const save = (patch: Partial<typeof cfg.value>) =>
    cfg.save({ ...cfg.value, ...patch }).catch(() => toast('No se han podido guardar los ajustes', 'error'))

  const addPlatform = (e: FormEvent) => {
    e.preventDefault()
    const p = platform.trim()
    if (!p || cfg.value.watch_platforms.some((x) => x.toLocaleLowerCase('es') === p.toLocaleLowerCase('es'))) return setPlatform('')
    void save({ watch_platforms: [...cfg.value.watch_platforms, p] })
    setPlatform('')
  }
  const addTag = (e: FormEvent) => {
    e.preventDefault()
    const t = normalizeTag(tag)
    if (t && !cfg.value.note_tags.includes(t)) void save({ note_tags: [...cfg.value.note_tags, t] })
    setTag('')
  }

  return (
    <>
      <Card title="Categorías de gasto" flush>
        {(categories.data ?? []).map((c) => (
          <ListRow
            key={c.id}
            title={c.name}
            value={c.monthly_budget === null ? 'Sin presupuesto' : `${formatEuros(c.monthly_budget)} / mes`}
            onClick={() => setEditing(c)}
          />
        ))}
        <ListRow title="Añadir categoría" icon={<Plus size={18} />} onClick={() => setEditing('new')} />
      </Card>

      <Card title="Tipos de la watchlist">
        <p className={s.muted}>{WATCH_KINDS.map((k) => KIND_LABEL[k]).join(' · ')}</p>
        <p className={s.small} style={{ margin: '8px 0 0' }}>
          Los tipos son fijos; los estados son pendiente, en curso y terminado.
        </p>
      </Card>

      <Card title="Plataformas de la watchlist">
        <Chips
          items={cfg.value.watch_platforms}
          label={(x) => `Quitar ${x}`}
          onRemove={(x) => save({ watch_platforms: cfg.value.watch_platforms.filter((p) => p !== x) })}
        />
        <form className={s.inline} onSubmit={addPlatform} style={{ marginTop: 12 }}>
          <input className="input" aria-label="Nueva plataforma" placeholder="Nueva plataforma" value={platform} onChange={(e) => setPlatform(e.target.value)} />
          <button type="submit" className="btn btn-plain">
            Añadir
          </button>
        </form>
      </Card>

      <Card title="Etiquetas de notas">
        <p className={s.small} style={{ margin: '0 0 8px' }}>
          Se sugieren al editar una nota, además de las que ya usas.
        </p>
        <Chips
          items={cfg.value.note_tags}
          label={(x) => `Quitar ${x}`}
          onRemove={(x) => save({ note_tags: cfg.value.note_tags.filter((p) => p !== x) })}
        />
        <form className={s.inline} onSubmit={addTag} style={{ marginTop: 12 }}>
          <input className="input" aria-label="Nueva etiqueta" placeholder="Nueva etiqueta" value={tag} onChange={(e) => setTag(e.target.value)} />
          <button type="submit" className="btn btn-plain">
            Añadir
          </button>
        </form>
      </Card>

      <CategorySheet category={editing} count={categories.data?.length ?? 0} onClose={() => setEditing(null)} />
    </>
  )
}

function Chips({ items, onRemove, label }: { items: string[]; onRemove: (x: string) => void; label: (x: string) => string }) {
  if (items.length === 0) return <p className={s.muted}>Ninguna todavía.</p>
  return (
    <div className={s.tags}>
      {items.map((x) => (
        <button key={x} type="button" className={s.tagBtn} onClick={() => onRemove(x)} aria-label={label(x)}>
          {x} <Close size={12} />
        </button>
      ))}
    </div>
  )
}

function CategorySheet({ category, count, onClose }: { category: ExpenseCategory | 'new' | null; count: number; onClose: () => void }) {
  return (
    <Sheet open={category !== null} onClose={onClose} title={category === 'new' ? 'Nueva categoría' : 'Categoría'}>
      {category && <CategoryForm key={category === 'new' ? 'new' : category.id} category={category === 'new' ? null : category} count={count} onClose={onClose} />}
    </Sheet>
  )
}

function CategoryForm({ category, count, onClose }: { category: ExpenseCategory | null; count: number; onClose: () => void }) {
  const toast = useToast()
  const save = useSaveCategory()
  const del = useDeleteCategory()
  const [name, setName] = useState(category?.name ?? '')
  const [budget, setBudget] = useState<number | null>(category?.monthly_budget ?? null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (budget !== null && budget < 0) return toast('El presupuesto no puede ser negativo', 'error')
    try {
      await save.mutateAsync({
        ...(category ? { id: category.id } : { position: count }),
        name: name.trim(),
        monthly_budget: budget === null ? null : Math.round(budget * 100) / 100,
      })
      toast('Categoría guardada')
      onClose()
    } catch (err) {
      toast(err instanceof Error && /duplicate|unique/i.test(err.message) ? 'Ya existe una categoría con ese nombre' : 'No se ha podido guardar', 'error')
    }
  }
  const remove = async () => {
    if (!category || !confirm(`¿Eliminar «${category.name}»? Sus gastos quedarán sin categoría.`)) return
    try {
      await del.mutateAsync(category.id)
      toast('Categoría eliminada')
      onClose()
    } catch {
      toast('No se ha podido eliminar', 'error')
    }
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <label className={`field ${s.full}`}>
        <span className="field-label">Nombre</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className={`field ${s.full}`}>
        <span className="field-label">Presupuesto mensual (€)</span>
        <NumberInput decimals={2} inputMode="decimal" value={budget} onCommit={setBudget} placeholder="Sin presupuesto" />
      </label>
      <button type="submit" className={`btn btn-primary ${s.full}`} disabled={save.isPending}>
        Guardar
      </button>
      {category && (
        <button type="button" className={`btn ${s.dangerBtn} ${s.full}`} onClick={remove} disabled={del.isPending}>
          Eliminar categoría
        </button>
      )}
    </form>
  )
}
