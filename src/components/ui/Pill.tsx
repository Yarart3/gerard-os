import type { ReactNode } from 'react'
import s from './Pill.module.css'

type Tone = 'default' | 'accent' | 'orange' | 'green'

export function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`${s.pill} ${s[tone]}`}>{children}</span>
}
