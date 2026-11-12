import { Card } from '../../../components/ui'
import { Plus } from '../../../components/ui/icons'
import { formatShortDate } from '../../../lib/dates'
import type { DisplayEvent } from '../logic/events'
import { EventItem } from './EventItem'
import s from '../Agenda.module.css'

type Props = {
  days: readonly string[]
  today: string
  byDay: Map<string, DisplayEvent[]>
  onOpen: (ev: DisplayEvent) => void
  onAdd: (iso: string) => void
  showEmpty?: boolean
}

/** Lista por día: se usa para la vista semana (7 días) y la vista día (1). */
export function DayList({ days, today, byDay, onOpen, onAdd, showEmpty = true }: Props) {
  return (
    <div>
      {days.map((d) => {
        const list = byDay.get(d) ?? []
        return (
          <section key={d} className={s.dayBlock} aria-label={formatShortDate(d)}>
            <div className={`${s.dayHead} ${d === today ? s.dayHeadToday : ''}`}>
              <span>{d === today ? `Hoy · ${formatShortDate(d)}` : formatShortDate(d)}</span>
              <button type="button" className={s.iconBtn} onClick={() => onAdd(d)} aria-label={`Añadir evento el ${formatShortDate(d)}`}>
                <Plus size={20} />
              </button>
            </div>
            {list.length || showEmpty ? (
              <Card flush>
                {list.length ? (
                  list.map((e) => <EventItem key={e.key} ev={e} onOpen={onOpen} />)
                ) : (
                  <p className={s.empty}>Sin eventos</p>
                )}
              </Card>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}
