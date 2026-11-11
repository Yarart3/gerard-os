import type { ReactNode } from 'react'
import { Tray } from './icons'
import s from './EmptyState.module.css'

type Props = { title: string; text?: string; icon?: ReactNode; action?: ReactNode }

export function EmptyState({ title, text, icon, action }: Props) {
  return (
    <div className={s.root}>
      <div className={s.icon}>{icon ?? <Tray size={40} />}</div>
      <p className={s.title}>{title}</p>
      {text && <p className={s.text}>{text}</p>}
      {action}
    </div>
  )
}
