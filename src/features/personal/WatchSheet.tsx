import { useState, type FormEvent } from 'react'
import { NumberInput, SegmentedControl, Sheet, useToast } from '../../components/ui'
import { useDeleteWatch, useSaveWatch, type WatchItem } from './api'
import { usePersonalSettings } from './personalSettings'
import { KIND_LABEL, WATCH_KINDS, statusLabel, type WatchKind, type WatchStatus } from './logic/watchlist'
import s from './Personal.module.css'

export function WatchSheet({ item, onClose }: { item: WatchItem | 'new' | null; onClose: () => void }) {
  return (
    <Sheet open={item !== null} onClose={onClose} title={item === 'new' ? 'Añadir a la lista' : 'Editar'}>
      {item && <Form key={item === 'new' ? 'new' : item.id} item={item === 'new' ? null : item} onClose={onClose} />}
    </Sheet>
  )
}

function Form({ item, onClose }: { item: WatchItem | null; onClose: () => void }) {
  const toast = useToast()
  const save = useSaveWatch()
  const del = useDeleteWatch()
  const { value: cfg } = usePersonalSettings()
  const [title, setTitle] = useState(item?.title ?? '')
  const [kind, setKind] = useState<WatchKind>((item?.kind as WatchKind) ?? 'series')
  const [status, setStatus] = useState<WatchStatus>((item?.status as WatchStatus) ?? 'pending')
  const [platform, setPlatform] = useState(item?.platform ?? '')
  const [progress, setProgress] = useState(item?.progress ?? '')
  const [rating, setRating] = useState<number | null>(item?.rating ?? null)
  const [notes, setNotes] = useState(item?.notes ?? '')

  const kindOptions = WATCH_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))
  const statusOptions = (['pending', 'watching', 'done'] as const).map((st) => ({
    value: st,
    label: statusLabel(st, kind),
  }))
  const platforms = [...new Set([...cfg.watch_platforms, ...(platform ? [platform] : [])])]

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    if (rating !== null && (rating < 0 || rating > 10)) return toast('La valoración va de 0 a 10', 'error')
    try {
      await save.mutateAsync({
        ...(item ? { id: item.id } : {}),
        title: title.trim(),
        kind,
        status,
        platform: platform.trim() || null,
        progress: progress.trim() || null,
        rating,
        notes: notes.trim() || null,
      })
      toast('Guardado')
      onClose()
    } catch {
      toast('No se ha podido guardar', 'error')
    }
  }
  const remove = async () => {
    if (!item || !confirm(`¿Eliminar «${item.title}»?`)) return
    try {
      await del.mutateAsync(item.id)
      toast('Eliminado')
      onClose()
    } catch {
      toast('No se ha podido eliminar', 'error')
    }
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <label className={`field ${s.full}`}>
        <span className="field-label">Título</span>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <div className={`field ${s.full}`}>
        <span className="field-label">Tipo</span>
        <SegmentedControl label="Tipo" options={kindOptions} value={kind} onChange={setKind} />
      </div>
      <div className={`field ${s.full}`}>
        <span className="field-label">Estado</span>
        <SegmentedControl label="Estado" options={statusOptions} value={status} onChange={setStatus} />
      </div>
      <label className="field">
        <span className="field-label">Plataforma</span>
        <input className="input" list="watch-platforms" value={platform} onChange={(e) => setPlatform(e.target.value)} />
        <datalist id="watch-platforms">
          {platforms.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </label>
      <label className="field">
        <span className="field-label">Progreso</span>
        <input
          className="input"
          value={progress}
          onChange={(e) => setProgress(e.target.value)}
          placeholder={kind === 'book' ? 'Pág. 120' : 'T2 E4'}
        />
      </label>
      <label className="field">
        <span className="field-label">Valoración (0–10)</span>
        <NumberInput decimals={1} value={rating} onCommit={setRating} placeholder="Sin nota" />
      </label>
      <label className={`field ${s.full}`}>
        <span className="field-label">Notas</span>
        <textarea className={s.textarea} style={{ minHeight: 90 }} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <button type="submit" className={`btn btn-primary ${s.full}`} disabled={save.isPending}>
        Guardar
      </button>
      {item && (
        <button type="button" className={`btn ${s.dangerBtn} ${s.full}`} onClick={remove} disabled={del.isPending}>
          Eliminar
        </button>
      )}
    </form>
  )
}
