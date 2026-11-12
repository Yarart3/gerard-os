import { useState, type FormEvent } from 'react'
import { Sheet, useToast } from '../../../components/ui'
import { formatNumber } from '../../../lib/format'
import { useDeleteMilestone, useSaveMilestone, type Milestone } from '../api'
import s from '../Agenda.module.css'

type Props = { milestone: Milestone | 'new' | null; nextPosition: number; onClose: () => void }

export function MilestoneSheet({ milestone, nextPosition, onClose }: Props) {
  return (
    <Sheet open={milestone !== null} onClose={onClose} title={milestone === 'new' ? 'Nuevo hito del TFG' : 'Hito del TFG'}>
      {milestone && <Form key={milestone === 'new' ? 'new' : milestone.id} milestone={milestone === 'new' ? null : milestone} nextPosition={nextPosition} onClose={onClose} />}
    </Sheet>
  )
}

function Form({ milestone, nextPosition, onClose }: { milestone: Milestone | null; nextPosition: number; onClose: () => void }) {
  const toast = useToast()
  const save = useSaveMilestone()
  const del = useDeleteMilestone()
  const [title, setTitle] = useState(milestone?.title ?? '')
  const [progress, setProgress] = useState(milestone?.progress ?? 0)
  const [due, setDue] = useState(milestone?.due_at ?? '')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    try {
      await save.mutateAsync({
        ...(milestone ? { id: milestone.id } : { position: nextPosition }),
        title: title.trim(),
        progress,
        due_at: due || null,
      })
      toast('Hito guardado')
      onClose()
    } catch {
      toast('No se ha podido guardar', 'error')
    }
  }
  const remove = async () => {
    if (!milestone || !confirm(`¿Eliminar «${milestone.title}»?`)) return
    try {
      await del.mutateAsync(milestone.id)
      onClose()
    } catch {
      toast('No se ha podido eliminar', 'error')
    }
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <label className={`field ${s.full}`}>
        <span className="field-label">Hito</span>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label className={`field ${s.full}`}>
        <span className="field-label">Progreso: {formatNumber(progress, 0)} %</span>
        <input type="range" className={s.range} min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(Number(e.target.value))} />
      </label>
      <label className={`field ${s.full}`}>
        <span className="field-label">Fecha objetivo (opcional)</span>
        <input type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
      </label>
      <button type="submit" className={`btn btn-primary ${s.full}`} disabled={save.isPending}>
        Guardar
      </button>
      {milestone && (
        <button type="button" className={`btn ${s.dangerBtn} ${s.full}`} onClick={remove} disabled={del.isPending}>
          Eliminar hito
        </button>
      )}
    </form>
  )
}
