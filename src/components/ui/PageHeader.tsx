import { formatDateLabel } from '../../lib/format'
import { Gear } from './icons'
import s from './PageHeader.module.css'

type Props = {
  title: string
  onSettings?: () => void
  settingsLabel?: string
  date?: Date | null // null oculta la fecha
}

/** Fecha en mayúsculas + título grande + rueda de ajustes. */
export function PageHeader({ title, onSettings, settingsLabel = 'Ajustes', date }: Props) {
  return (
    <header className={s.header}>
      <div>
        {date !== null && <p className={s.date}>{formatDateLabel(date ?? new Date())}</p>}
        <h1 className={s.title}>{title}</h1>
      </div>
      {onSettings && (
        <button type="button" className={s.gear} onClick={onSettings} aria-label={settingsLabel}>
          <Gear size={24} />
        </button>
      )}
    </header>
  )
}
