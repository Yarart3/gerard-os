import { Link } from 'react-router-dom'
import { formatDateLabel } from '../../lib/format'
import s from './PageHeader.module.css'

type Props = {
  title: string
  /** Enlace «Ajustar» al apartado de esta pantalla en la página de Ajustes. */
  settingsTo?: string
  settingsLabel?: string
  date?: Date | null // null oculta la fecha
}

/** Fecha en mayúsculas + título grande + enlace «Ajustar». */
export function PageHeader({ title, settingsTo, settingsLabel, date }: Props) {
  return (
    <header className={s.header}>
      <div>
        {date !== null && <p className={s.date}>{formatDateLabel(date ?? new Date())}</p>}
        <h1 className={s.title}>{title}</h1>
      </div>
      {settingsTo && (
        <Link to={settingsTo} className={s.adjust} aria-label={settingsLabel}>
          Ajustar
        </Link>
      )}
    </header>
  )
}
