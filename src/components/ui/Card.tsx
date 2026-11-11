import type { ReactNode } from 'react'
import s from './Card.module.css'

type Props = {
  title?: string
  action?: ReactNode
  children?: ReactNode
  className?: string
  flush?: boolean // sin padding interior (para listas de ListRow)
}

export function Card({ title, action, children, className, flush }: Props) {
  return (
    <section className={[s.card, flush ? s.flush : '', className ?? ''].join(' ')}>
      {(title || action) && (
        <header className={s.header}>
          {title && <h2 className={s.title}>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
