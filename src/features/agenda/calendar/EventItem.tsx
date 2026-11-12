import type { CSSProperties } from 'react'
import { Pill } from '../../../components/ui'
import { eventTimeLabel } from '../format'
import type { DisplayEvent } from '../logic/events'
import s from '../Agenda.module.css'

/** Fila de evento (semana, día). Se puede pulsar para editarlo o, si es una entrega, ir a Uni. */
export function EventItem({ ev, onOpen }: { ev: DisplayEvent; onOpen: (ev: DisplayEvent) => void }) {
  const style = { '--c': ev.color } as CSSProperties
  const body = (
    <>
      <span className={s.evBar} aria-hidden="true" />
      <span className={s.evText}>
        <span className={s.evTitle}>{ev.title}</span>
        <span className={s.evMeta}>
          {[eventTimeLabel(ev), ev.location].filter(Boolean).join(' · ')}
          {ev.recurring ? ' · Se repite' : ''}
        </span>
      </span>
      {ev.kind === 'deadline' && <Pill tone="orange">Uni</Pill>}
    </>
  )
  return (
    <button
      type="button"
      className={`${s.evRow} ${ev.done ? s.evDone : ''}`}
      style={style}
      onClick={() => onOpen(ev)}
      aria-label={`${ev.title}, ${eventTimeLabel(ev)}`}
    >
      {body}
    </button>
  )
}
