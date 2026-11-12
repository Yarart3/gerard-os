import { useMemo, useState } from 'react'
import { Card, EmptyState, SearchInput } from '../../components/ui'
import { Plus } from '../../components/ui/icons'
import { useNotes, type Note } from './api'
import { allTags, filterNotes } from './logic/notes'
import { NoteSheet } from './NoteSheet'
import { usePersonalSettings } from './personalSettings'
import { formatDayMonth, todayISO } from '../../lib/dates'
import s from './Personal.module.css'

export function NotesTab() {
  const notes = useNotes()
  const { value: cfg } = usePersonalSettings()
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [editing, setEditing] = useState<Note | 'new' | null>(null)
  const all = useMemo(() => notes.data ?? [], [notes.data])
  const tags = useMemo(() => allTags(all), [all])
  const shown = useMemo(() => filterNotes(all, query, tag), [all, query, tag])
  const pinned = shown.filter((n) => n.pinned)
  const rest = shown.filter((n) => !n.pinned)

  const renderNote = (n: Note) => (
    <button key={n.id} type="button" className={s.row} style={{ alignItems: 'flex-start' }} onClick={() => setEditing(n)}>
      <span className={s.rowText}>
        <span className={s.rowTitle}>{n.title || 'Sin título'}</span>
        {n.body && <span className={s.noteBody}>{n.body}</span>}
        <span className={s.rowMeta}>
          {formatDayMonth(todayISO(new Date(n.updated_at)))}
          {n.tags.length > 0 ? ` · ${n.tags.map((t) => `#${t}`).join(' ')}` : ''}
        </span>
      </span>
    </button>
  )

  return (
    <div className={s.stack}>
      <div className={s.inline}>
        <div className={s.grow}>
          <SearchInput value={query} onChange={setQuery} label="Buscar en las notas" />
        </div>
        <button type="button" className="btn btn-plain" onClick={() => setEditing('new')}>
          <Plus size={18} /> Nueva
        </button>
      </div>
      {(tags.length > 0 || tag) && (
        <div className={s.tags} role="group" aria-label="Filtrar por etiqueta">
          {(tag && !tags.includes(tag) ? [...tags, tag] : tags).map((t) => (
            <button key={t} type="button" className={s.tagBtn} aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>
              #{t}
            </button>
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <Card>
          <EmptyState
            title={notes.isLoading ? 'Cargando…' : all.length === 0 ? 'Sin notas' : 'Sin resultados'}
            text={all.length === 0 && !notes.isLoading ? 'Apunta ideas, listas o recordatorios.' : undefined}
          />
        </Card>
      ) : (
        <div className={s.grid2}>
          {pinned.length > 0 && (
            <Card title="Fijadas" flush>
              {pinned.map(renderNote)}
            </Card>
          )}
          {rest.length > 0 && (
            <Card title={pinned.length > 0 ? 'Notas' : undefined} flush>
              {rest.map(renderNote)}
            </Card>
          )}
        </div>
      )}
      <NoteSheet note={editing} suggestions={[...tags, ...cfg.note_tags]} onClose={() => setEditing(null)} />
    </div>
  )
}
