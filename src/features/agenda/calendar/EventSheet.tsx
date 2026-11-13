import { useState, type FormEvent } from 'react'
import { NeedsConnection, Sheet, useToast } from '../../../components/ui'
import { useOnline } from '../../../lib/offline/connectivity'
import { useEventMutations, type Calendar, type EventRow } from '../api'
import { eventToForm, formToPayload, newEventForm, type EventForm } from '../logic/eventForm'
import s from '../Agenda.module.css'

export type EventSelection = { mode: 'new'; date: string } | { mode: 'edit'; row: EventRow }

type Props = { target: EventSelection | null; calendars: readonly Calendar[]; onClose: () => void }

export function EventSheet({ target, calendars, onClose }: Props) {
  return (
    <Sheet open={target !== null} onClose={onClose} title={target?.mode === 'edit' ? 'Editar evento' : 'Nuevo evento'}>
      {target && <Form key={target.mode === 'edit' ? target.row.id : target.date} target={target} calendars={calendars} onClose={onClose} />}
    </Sheet>
  )
}

function Form({
  target,
  calendars,
  onClose,
}: {
  target: NonNullable<Props['target']>
  calendars: readonly Calendar[]
  onClose: () => void
}) {
  const toast = useToast()
  const { create, update, remove } = useEventMutations()
  const editing = target.mode === 'edit' ? target.row : null
  const [f, setF] = useState<EventForm>(() => (editing ? eventToForm(editing) : newEventForm(target.mode === 'new' ? target.date : '')))
  const [calendarId, setCalendarId] = useState(
    () => editing?.calendar_id ?? (calendars.find((c) => c.is_default) ?? calendars[0])?.id ?? '',
  )
  const set = <K extends keyof EventForm>(k: K, v: EventForm[K]) => setF((p) => ({ ...p, [k]: v }))
  const online = useOnline()
  const busy = !online || create.isPending || update.isPending || remove.isPending
  const saving = create.isPending || update.isPending || remove.isPending

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const r = formToPayload(f)
    if ('error' in r) return toast(r.error, 'error')
    try {
      if (editing) await update.mutateAsync({ event_id: editing.id, event: r.payload })
      else {
        if (!calendarId) return toast('Descubre tus calendarios en Ajustes › Agenda', 'error')
        await create.mutateAsync({ calendar_id: calendarId, event: r.payload })
      }
      toast(editing ? 'Evento guardado en iCloud' : 'Evento creado en iCloud')
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se ha podido guardar', 'error')
    }
  }

  const del = async () => {
    if (!editing || !confirm(`¿Borrar «${editing.title}» de iCloud?`)) return
    try {
      await remove.mutateAsync(editing.id)
      toast('Evento borrado')
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se ha podido borrar', 'error')
    }
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <label className={`field ${s.full}`}>
        <span className="field-label">Título</span>
        <input className="input" value={f.title} onChange={(e) => set('title', e.target.value)} required />
      </label>
      <label className={`field ${s.full}`}>
        <span className="field-label">Calendario</span>
        <select className={`input ${s.select}`} value={calendarId} onChange={(e) => setCalendarId(e.target.value)} disabled={Boolean(editing)}>
          {calendars.length === 0 && <option value="">Sin calendarios</option>}
          {calendars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className={`${s.checkRow} ${s.full}`}>
        <input type="checkbox" className={s.checkbox} checked={f.allDay} onChange={(e) => set('allDay', e.target.checked)} />
        Todo el día
      </label>
      <label className="field">
        <span className="field-label">Empieza</span>
        <input type="date" className="input" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} required />
      </label>
      {!f.allDay && (
        <label className="field">
          <span className="field-label">Hora</span>
          <input type="time" className="input" value={f.startTime} onChange={(e) => set('startTime', e.target.value)} />
        </label>
      )}
      <label className="field">
        <span className="field-label">Termina</span>
        <input type="date" className="input" value={f.endDate} min={f.startDate} onChange={(e) => set('endDate', e.target.value)} />
      </label>
      {!f.allDay && (
        <label className="field">
          <span className="field-label">Hora</span>
          <input type="time" className="input" value={f.endTime} onChange={(e) => set('endTime', e.target.value)} />
        </label>
      )}
      <label className={`field ${s.full}`}>
        <span className="field-label">Lugar</span>
        <input className="input" value={f.location} onChange={(e) => set('location', e.target.value)} />
      </label>
      <label className={`field ${s.full}`}>
        <span className="field-label">Notas</span>
        <textarea className={s.textarea} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
      </label>
      {editing?.rrule && (
        <p className={`${s.small} ${s.full}`} style={{ margin: 0 }}>
          Evento recurrente: los cambios se aplican a toda la serie (se muestra la fecha del primer evento).
        </p>
      )}
      <button type="submit" className={`btn btn-primary ${s.full}`} disabled={busy}>
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
      <NeedsConnection className={s.full} />
      {editing && (
        <button type="button" className={`btn ${s.dangerBtn} ${s.full}`} onClick={del} disabled={busy}>
          Borrar evento
        </button>
      )}
    </form>
  )
}
