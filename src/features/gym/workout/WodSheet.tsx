import { useMemo, useState } from 'react'
import { Card, Pill, Sheet, useToast } from '../../../components/ui'
import { useExercises, useSaveExercise, type Exercise } from '../api'
import { matchWod, suggestName } from '../logic/wodMatch'
import s from '../Gym.module.css'

type Props = {
  open: boolean
  onClose: () => void
  onAdd: (exercises: Exercise[], wodText: string) => Promise<void>
}

/** "Pegar WOD": texto de AimHarder → ejercicios del catálogo. No hace scraping. */
export function WodSheet({ open, onClose, onAdd }: Props) {
  const { data: catalog = [] } = useExercises()
  const save = useSaveExercise()
  const toast = useToast()
  const [text, setText] = useState('')
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const active = useMemo(() => catalog.filter((e) => !e.archived), [catalog])
  const lines = useMemo(() => matchWod(text, active), [text, active])
  const chosen = lines.flatMap((l) => (l.match && !excluded.has(l.match.id) ? [l.match] : []))
  const unknown = lines.filter((l) => !l.match)

  const toggle = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const create = async (query: string) => {
    try {
      // Tipo metcon y unidad repes: lo más habitual en un WOD; se puede editar en Catálogo.
      await save.mutateAsync({ name: suggestName(query), type: 'metcon', unit: 'reps', aliases: [query] })
    } catch {
      toast('No se ha podido crear', 'error')
    }
  }

  const add = async () => {
    setBusy(true)
    try {
      await onAdd(chosen, text.trim())
      setText('')
      setExcluded(new Set())
      onClose()
    } catch {
      toast('No se han podido añadir', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Pegar WOD">
      <label className="field">
        <span className="field-label">Texto del WOD (cópialo de AimHarder)</span>
        <textarea
          className={s.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'For time:\n21-15-9\nThrusters (43/29 kg)\nPull-ups'}
        />
      </label>
      {lines.length > 0 && (
        <Card title="Ejercicios detectados" flush>
          {lines.map((l) => (
            <div key={l.line + (l.match?.id ?? '')} className={s.wodLine}>
              {l.match ? (
                <input
                  type="checkbox"
                  className={s.checkbox}
                  checked={!excluded.has(l.match.id)}
                  onChange={() => toggle(l.match!.id)}
                  aria-label={`Incluir ${l.match.name}`}
                />
              ) : null}
              <span className={s.wodText}>
                <span>{l.match ? l.match.name : suggestName(l.query)}</span>
                <span className={s.small}>{l.line}</span>
              </span>
              {l.match ? (
                l.score < 1 ? (
                  <Pill tone="orange">Parecido</Pill>
                ) : null
              ) : (
                <button
                  type="button"
                  className="btn"
                  style={{ color: 'var(--accent)' }}
                  disabled={save.isPending}
                  onClick={() => create(l.query)}
                  aria-label={`Crear ${suggestName(l.query)} en el catálogo`}
                >
                  Crear
                </button>
              )}
            </div>
          ))}
        </Card>
      )}
      {unknown.length > 0 && (
        <p className={s.muted}>
          {unknown.length === 1 ? 'Hay 1 ejercicio nuevo' : `Hay ${unknown.length} ejercicios nuevos`}:
          tócalos para crearlos en el catálogo.
        </p>
      )}
      <button type="button" className="btn btn-primary" disabled={!chosen.length || busy} onClick={add}>
        {chosen.length ? `Añadir ${chosen.length} al entreno` : 'Añadir al entreno'}
      </button>
    </Sheet>
  )
}
