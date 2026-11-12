import { useState, type FormEvent } from 'react'
import { SegmentedControl, Sheet, useToast } from '../../../components/ui'
import { todayISO } from '../../../lib/dates'
import { TZ, localDateISO, utcToWall, zonedToUtcMs } from '../../../../supabase/functions/_shared/time.ts'
import { useDeleteDeadline, useSaveDeadline, type Deadline, type Subject } from '../api'
import s from '../Agenda.module.css'

type Kind = 'assignment' | 'exam' | 'other'
const KINDS = [
  { value: 'assignment', label: 'Entrega' },
  { value: 'exam', label: 'Examen' },
  { value: 'other', label: 'Otro' },
] as const

type Props = { deadline: Deadline | 'new' | null; subjects: readonly Subject[]; onClose: () => void }

export function DeadlineSheet({ deadline, subjects, onClose }: Props) {
  return (
    <Sheet open={deadline !== null} onClose={onClose} title={deadline === 'new' ? 'Nueva entrega o examen' : 'Entrega o examen'}>
      {deadline && <Form key={deadline === 'new' ? 'new' : deadline.id} deadline={deadline === 'new' ? null : deadline} subjects={subjects} onClose={onClose} />}
    </Sheet>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')

function Form({ deadline, subjects, onClose }: { deadline: Deadline | null; subjects: readonly Subject[]; onClose: () => void }) {
  const toast = useToast()
  const save = useSaveDeadline()
  const del = useDeleteDeadline()
  const due = deadline ? Date.parse(deadline.due_at) : null
  const wall = due !== null ? utcToWall(due, TZ) : null
  const [title, setTitle] = useState(deadline?.title ?? '')
  const [kind, setKind] = useState<Kind>((deadline?.kind as Kind | undefined) ?? 'assignment')
  const [subjectId, setSubjectId] = useState(deadline?.subject_id ?? '')
  const [date, setDate] = useState(due !== null ? localDateISO(due) : todayISO())
  const [time, setTime] = useState(wall ? `${pad(wall.h)}:${pad(wall.mi)}` : '23:59')
  const [done, setDone] = useState(deadline?.done ?? false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !date) return
    const [y, m, d] = date.split('-').map(Number) as [number, number, number]
    const [h, mi] = (time || '00:00').split(':').map(Number) as [number, number]
    try {
      await save.mutateAsync({
        ...(deadline ? { id: deadline.id } : {}),
        title: title.trim(),
        kind,
        subject_id: subjectId || null,
        due_at: new Date(zonedToUtcMs(y, m, d, h, mi, 0, TZ)).toISOString(),
        done,
      })
      toast('Guardado')
      onClose()
    } catch {
      toast('No se ha podido guardar', 'error')
    }
  }
  const remove = async () => {
    if (!deadline || !confirm(`¿Eliminar «${deadline.title}»?`)) return
    try {
      await del.mutateAsync(deadline.id)
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
        <SegmentedControl label="Tipo" options={KINDS} value={kind} onChange={setKind} />
      </div>
      <label className={`field ${s.full}`}>
        <span className="field-label">Asignatura</span>
        <select className={`input ${s.select}`} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">Sin asignatura</option>
          {subjects.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field-label">Fecha</span>
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <label className="field">
        <span className="field-label">Hora</span>
        <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
      </label>
      <label className={`${s.checkRow} ${s.full}`}>
        <input type="checkbox" className={s.checkbox} checked={done} onChange={(e) => setDone(e.target.checked)} />
        Hecha
      </label>
      <button type="submit" className={`btn btn-primary ${s.full}`} disabled={save.isPending}>
        Guardar
      </button>
      {deadline && (
        <button type="button" className={`btn ${s.dangerBtn} ${s.full}`} onClick={remove} disabled={del.isPending}>
          Eliminar
        </button>
      )}
    </form>
  )
}
