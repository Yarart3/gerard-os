import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from './icons'
import s from './ListRow.module.css'

type Props = {
  title: ReactNode
  subtitle?: ReactNode
  value?: ReactNode
  icon?: ReactNode
  to?: string
  onClick?: () => void
  chevron?: boolean
}

export function ListRow({
  title,
  subtitle,
  value,
  icon,
  to,
  onClick,
  chevron = Boolean(to || onClick),
}: Props) {
  const content = (
    <>
      {icon && <span className={s.icon}>{icon}</span>}
      <span className={s.text}>
        <span className={s.title}>{title}</span>
        {subtitle && <span className={s.subtitle}>{subtitle}</span>}
      </span>
      {value !== undefined && <span className={s.value}>{value}</span>}
      {chevron && <ChevronRight size={18} className={s.chevron} />}
    </>
  )
  if (to)
    return (
      <Link to={to} className={s.row}>
        {content}
      </Link>
    )
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={s.row}>
        {content}
      </button>
    )
  return <div className={s.row}>{content}</div>
}
