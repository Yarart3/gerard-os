import s from './ProgressBar.module.css'

type Props = {
  value: number // 0..1 (se recorta)
  label: string // texto accesible
  tone?: 'accent' | 'orange' | 'green'
}

export function ProgressBar({ value, label, tone = 'accent' }: Props) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      className={s.track}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className={`${s.bar} ${s[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
