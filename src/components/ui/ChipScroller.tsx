import type { Option } from './SegmentedControl'
import s from './ChipScroller.module.css'

type Props<T extends string> = {
  options: readonly Option<T>[]
  value: T
  onChange: (value: T) => void
  label: string
}

/** Fila horizontal desplazable de chips seleccionables. */
export function ChipScroller<T extends string>({ options, value, onChange, label }: Props<T>) {
  return (
    <div className={s.root} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          className={`${s.chip} ${o.value === value ? s.selected : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
