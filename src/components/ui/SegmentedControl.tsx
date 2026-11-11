import { useRef, type KeyboardEvent } from 'react'
import s from './SegmentedControl.module.css'

export type Option<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  options: readonly Option<T>[]
  value: T
  onChange: (value: T) => void
  label: string
}

/** Control segmentado accesible (radiogroup con navegación por flechas). */
export function SegmentedControl<T extends string>({ options, value, onChange, label }: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const next = (i + d + options.length) % options.length
    const opt = options[next]
    if (!opt) return
    onChange(opt.value)
    refs.current[next]?.focus()
  }
  return (
    <div className={s.root} role="radiogroup" aria-label={label}>
      {options.map((o, i) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={`${s.seg} ${selected ? s.selected : ''}`}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
