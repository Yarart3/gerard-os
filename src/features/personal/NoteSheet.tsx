import { useState, type FormEvent } from 'react'
import { Sheet, useToast } from '../../components/ui'
import { useDeleteNote, useSaveNote, type Note } from './api'
import { normalizeTag, parseTags } from './logic/notes'
import s from './Personal.module.css'

type Props = { note: Note | 'new' | null; suggestions: string[]; onClose: () => void }

export function NoteSheet({ note, suggestions, onClose }: Props) {
  return (
    <Sheet open={note !== null} onClose={onClose} title={note === 'new' ? 'Nueva nota' : 'Nota'}>
      {note && <Form key={note === 'new' ? 'new' : note.id} note={note === 'new' ? null : note} suggestions={suggestions} onClose={onClose} />}
    </Sheet>
  )
}

function Form({ note, suggestions, onClose }: { note: Note | null; suggestions: string[]; onClose: () => void }) {
  const toast = useToast()
  const save = useSaveNote()
  const del = useDeleteNote()
  const [title, setTitle] = useState(note?.title ?? '')
  const [body, setBody] = useState(note?.body ?? '')
  const [tags, setTags] = useState((note?.tags ?? []).join(', '))
  const [pinned, setPinned] = useState(note?.pinned ?? false)
  const current = parseTags(tags)
  const options = [...new Set(suggestions.map(normalizeTag))].filter((t) => t && !current.includes(t))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() && !body.trim()) return toast('Escribe algo en la nota', 'error')
    try {
      await save.mutateAsync({
        ...(note ? { id: note.id } : {}),
        title: title.trim(),
        body,
        tags: current,
        pinned,
      })
      toast('Nota guardada')
      onClose()
    } catch {
      toast('No se ha podido guardar', 'error')
    }
  }
  const remove = async () => {
    if (!note || !confirm('¿Eliminar esta nota?')) return
    try {
      await del.mutateAsync(note.id)
      toast('Nota eliminada')
      onClose()
    } catch {
      toast('No se ha podido eliminar', 'error')
    }
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <label className={`field ${s.full}`}>
        <span className="field-label">Título</span>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className={`field ${s.full}`}>
        <span className="field-label">Texto</span>
        <textarea className={s.textarea} value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      <label className={`field ${s.full}`}>
        <span className="field-label">Etiquetas (separadas por comas)</span>
        <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ideas, viaje" />
      </label>
      {options.length > 0 && (
        <div className={`${s.tags} ${s.full}`} role="group" aria-label="Etiquetas sugeridas">
          {options.map((t) => (
            <button key={t} type="button" className={s.tagBtn} onClick={() => setTags([...current, t].join(', '))}>
              + {t}
            </button>
          ))}
        </div>
      )}
      <label className={`${s.checkRow} ${s.full}`}>
        <input type="checkbox" className={s.checkbox} checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
        Fijar arriba
      </label>
      <button type="submit" className={`btn btn-primary ${s.full}`} disabled={save.isPending}>
        Guardar
      </button>
      {note && (
        <button type="button" className={`btn ${s.dangerBtn} ${s.full}`} onClick={remove} disabled={del.isPending}>
          Eliminar nota
        </button>
      )}
    </form>
  )
}
