import { useState, type FormEvent } from 'react'
import { NumberInput, SegmentedControl, Sheet, useToast } from '../../../components/ui'
import { Check } from '../../../components/ui/icons'
import { useDeleteSubject, useSaveSubject, type Subject } from '../api'
import { PALETTE } from '../logic/palette'
import s from '../Agenda.module.css'

const TERMS = [
  { value: '1', label: '1.er cuatrimestre' },
  { value: '2', label: '2.º cuatrimestre' },
] as const

export function SubjectSheet({ subject, onClose }: { subject: Subject | 'new' | null; onClose: () => void }) {
  return (
    <Sheet open={subject !== null} onClose={onClose} title={subject === 'new' ? 'Nueva asignatura' : 'Asignatura'}>
      {subject && <Form key={subject === 'new' ? 'new' : subject.id} subject={subject === 'new' ? null : subject} onClose={onClose} />}
    </Sheet>
  )
}

function Form({ subject, onClose }: { subject: Subject | null; onClose: () => void }) {
  const toast = useToast()
  const save = useSaveSubject()
  const del = useDeleteSubject()
  const [name, setName] = useState(subject?.name ?? '')
  const [color, setColor] = useState(subject?.color ?? PALETTE[0]!)
  const [ects, setEcts] = useState<number | null>(subject?.ects ?? 6)
  const [course, setCourse] = useState(String(subject?.course ?? 1))
  const [term, setTerm] = useState(String(subject?.term ?? 1))
  const [grade, setGrade] = useState<number | null>(subject?.grade ?? null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (grade !== null && (grade < 0 || grade > 10)) return toast('La nota va de 0 a 10', 'error')
    try {
      await save.mutateAsync({
        ...(subject ? { id: subject.id } : {}),
        name: name.trim(),
        color,
        ects,
        course: Number(course),
        term: Number(term),
        grade,
      })
      toast('Asignatura guardada')
      onClose()
    } catch {
      toast('No se ha podido guardar', 'error')
    }
  }
  const remove = async () => {
    if (!subject || !confirm(`¿Eliminar «${subject.name}»? Sus entregas quedarán sin asignatura.`)) return
    try {
      await del.mutateAsync(subject.id)
      toast('Asignatura eliminada')
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
      <div className={`field ${s.full}`}>
        <span className="field-label">Color</span>
        <div className={s.swatches}>
          {PALETTE.map((c) => (
            <button key={c} type="button" className={s.swatch} onClick={() => setColor(c)} aria-label={`Color ${c}`} aria-pressed={color === c}>
              <span style={{ background: c }}>{color === c && <Check size={16} />}</span>
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        <span className="field-label">ECTS</span>
        <NumberInput decimals={1} value={ects} onCommit={setEcts} />
      </label>
      <label className="field">
        <span className="field-label">Nota (0–10)</span>
        <NumberInput decimals={2} value={grade} onCommit={setGrade} placeholder="Sin nota" />
      </label>
      <label className="field">
        <span className="field-label">Curso</span>
        <select className={`input ${s.select}`} value={course} onChange={(e) => setCourse(e.target.value)}>
          {[1, 2, 3, 4, 5, 6].map((c) => (
            <option key={c} value={c}>
              {c}.º
            </option>
          ))}
        </select>
      </label>
      <div className={`field ${s.full}`}>
        <span className="field-label">Cuatrimestre</span>
        <SegmentedControl label="Cuatrimestre" options={TERMS} value={term as '1' | '2'} onChange={setTerm} />
      </div>
      <button type="submit" className={`btn btn-primary ${s.full}`} disabled={save.isPending}>
        Guardar
      </button>
      {subject && (
        <button type="button" className={`btn ${s.dangerBtn} ${s.full}`} onClick={remove} disabled={del.isPending}>
          Eliminar asignatura
        </button>
      )}
    </form>
  )
}
