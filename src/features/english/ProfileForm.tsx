import { useState, type FormEvent } from 'react'
import { SegmentedControl, useToast } from '../../components/ui'
import { useSaveProfile } from './api'
import {
  ACCENT_OPTIONS,
  DEVICE_OPTIONS,
  EXPLAIN_OPTIONS,
  GOAL_OPTIONS,
  HARDEST_OPTIONS,
  LEVELS,
  MINUTES_OPTIONS,
  NATIVE_OPTIONS,
  TOPIC_OPTIONS,
  type EnglishAnswers,
  type EnglishProfile,
  type Level,
} from './profile'
import s from './English.module.css'

type Opt = { value: string; label: string }

function MultiPills({ label, options, value, onChange }: { label: string; options: readonly Opt[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="field">
      <span className="field-label" id={`ml-${label}`}>
        {label}
      </span>
      <div className={s.pills} role="group" aria-labelledby={`ml-${label}`}>
        {options.map((o) => {
          const on = value.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              className={`${s.toggle} ${on ? s.toggleOn : ''}`}
              onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function One({ label, options, value, onChange }: { label: string; options: readonly Opt[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <SegmentedControl label={label} options={options} value={value} onChange={onChange} />
    </div>
  )
}

type Props = { initial: EnglishProfile; onDone: () => void; submitLabel?: string }

/** Cuestionario de la sección 7 (onboarding y edición desde Ajustes). Todo opcional salvo elegir nivel. */
export function ProfileForm({ initial, onDone, submitLabel = 'Guardar' }: Props) {
  const toast = useToast()
  const save = useSaveProfile()
  const [level, setLevel] = useState<Level>(initial.level)
  const [a, setA] = useState<EnglishAnswers>(initial.answers)
  const set = <K extends keyof EnglishAnswers>(k: K, v: EnglishAnswers[K]) => setA((x) => ({ ...x, [k]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await save.mutateAsync({ level, answers: { ...a, artists: a.artists.trim(), fun: a.fun.trim() } })
      toast('Perfil guardado')
      onDone()
    } catch {
      toast('No se ha podido guardar el perfil', 'error')
    }
  }

  return (
    <form className={s.profileForm} onSubmit={submit}>
      <One label="Lengua materna" options={NATIVE_OPTIONS} value={a.native} onChange={(v) => set('native', v)} />
      <One label="Nivel de inglés" options={LEVELS.map((l) => ({ value: l, label: l }))} value={level} onChange={(v) => setLevel(v as Level)} />
      <MultiPills label="Qué te cuesta más" options={HARDEST_OPTIONS} value={a.hardest} onChange={(v) => set('hardest', v)} />
      <MultiPills label="Para qué lo quieres" options={GOAL_OPTIONS} value={a.goals} onChange={(v) => set('goals', v)} />
      <One label="Idioma de las explicaciones" options={EXPLAIN_OPTIONS} value={a.explain} onChange={(v) => set('explain', v as EnglishAnswers['explain'])} />
      <MultiPills label="Temas favoritos" options={TOPIC_OPTIONS} value={a.topics} onChange={(v) => set('topics', v)} />
      <One label="Minutos al día" options={MINUTES_OPTIONS} value={String(a.minutes)} onChange={(v) => set('minutes', Number(v))} />
      <One label="Dispositivo que más usarás" options={DEVICE_OPTIONS} value={a.device} onChange={(v) => set('device', v)} />
      <One label="Acento del audio" options={ACCENT_OPTIONS} value={a.accent} onChange={(v) => set('accent', v as EnglishAnswers['accent'])} />
      <label className="field">
        <span className="field-label">Artistas que canten en inglés (opcional)</span>
        <input className="input" value={a.artists} onChange={(e) => set('artists', e.target.value)} placeholder="Separados por comas" />
      </label>
      <label className="field">
        <span className="field-label">Detalles personales para los ejemplos (opcional)</span>
        <textarea className={s.textarea} value={a.fun} onChange={(e) => set('fun', e.target.value)} placeholder="Manías, mascotas, trabajo… la IA los usará con humor" />
      </label>
      <button type="submit" className="btn btn-primary" disabled={save.isPending}>
        {submitLabel}
      </button>
    </form>
  )
}
