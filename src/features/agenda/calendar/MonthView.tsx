import type { CSSProperties } from 'react'
import { Card } from '../../../components/ui'
import { formatWeekdayShort } from '../../../lib/dates'
import type { DisplayEvent } from '../logic/events'
import { eventsOnDay } from '../logic/events'
import { monthGrid, type FirstDay } from '../logic/grid'
import s from '../Agenda.module.css'

type Props = {
  anchor: string
  today: string
  firstDay: FirstDay
  events: readonly DisplayEvent[]
  onPickDay: (iso: string) => void
}

const MAX_CHIPS = 3

export function MonthView({ anchor, today, firstDay, events, onPickDay }: Props) {
  const rows = monthGrid(anchor, firstDay)
  const month = anchor.slice(0, 7)
  return (
    <Card>
      <div className={s.weekdays} aria-hidden="true">
        {rows[0]!.map((d) => (
          <span key={d}>{formatWeekdayShort(d).replace('.', '').slice(0, 3)}</span>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row[0]} className={s.monthRow} role="row">
          {row.map((d) => {
            const list = eventsOnDay(events, d)
            const cls = [s.cell, d.startsWith(month) ? '' : s.outside, d === today ? s.today : ''].join(' ')
            return (
              <button
                key={d}
                type="button"
                className={cls}
                onClick={() => onPickDay(d)}
                aria-label={`${Number(d.slice(8))} ${d}${list.length ? `, ${list.length} eventos` : ''}`}
              >
                <span className={s.dayNum}>{Number(d.slice(8))}</span>
                <span className={s.dots}>
                  {list.slice(0, 4).map((e) => (
                    <span key={e.key} className={s.dot} style={{ background: e.color, width: 7, height: 7 }} />
                  ))}
                </span>
                <span className={s.chips}>
                  {list.slice(0, MAX_CHIPS).map((e) => (
                    <span key={e.key} className={s.chip} style={{ '--c': e.color } as CSSProperties}>
                      {e.title}
                    </span>
                  ))}
                  {list.length > MAX_CHIPS && <span className={s.more}>+{list.length - MAX_CHIPS} más</span>}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </Card>
  )
}
