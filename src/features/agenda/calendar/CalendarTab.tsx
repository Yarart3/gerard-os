import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, EmptyState, SegmentedControl, useToast, type Option } from '../../../components/ui'
import { ChevronLeft, ChevronRight, Plus } from '../../../components/ui/icons'
import { formatLongDate, todayISO } from '../../../lib/dates'
import {
  useCalendars,
  useCaldavSync,
  useDeadlines,
  useEvents,
  useSubjects,
  useSyncStatus,
  type EventRow,
} from '../api'
import { useAgendaSettings } from '../agendaSettings'
import { formatAgo, formatMonthYear, formatWeekRange } from '../format'
import { buildEvents, deadlineEvents, groupByDay, type DisplayEvent } from '../logic/events'
import { shiftAnchor, viewRange, weekOf, type CalView } from '../logic/grid'
import { DayList } from './DayList'
import { EventSheet, type EventSelection } from './EventSheet'
import { MonthView } from './MonthView'
import s from '../Agenda.module.css'

const VIEWS: readonly Option<CalView>[] = [
  { value: 'month', label: 'Mes' },
  { value: 'week', label: 'Semana' },
  { value: 'day', label: 'Día' },
]
const STALE_MS = 5 * 60_000

export function CalendarTab() {
  const toast = useToast()
  const navigate = useNavigate()
  const { value: cfg } = useAgendaSettings()
  const today = todayISO()
  const [view, setView] = useState<CalView>('month')
  const [anchor, setAnchor] = useState(today)
  const [target, setTarget] = useState<EventSelection | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const { from, to } = viewRange(view, anchor, cfg.first_day)
  const calendars = useCalendars()
  const events = useEvents(from, to)
  const deadlines = useDeadlines()
  const subjects = useSubjects()
  const status = useSyncStatus()
  const sync = useCaldavSync()

  // Sincroniza al abrir si hace más de 5 min (o nunca). Una vez por montaje; los fallos no molestan.
  const autoSynced = useRef(false)
  useEffect(() => {
    if (autoSynced.current || status.isLoading || calendars.isLoading) return
    autoSynced.current = true
    const last = status.data?.lastSyncedAt
    if (last == null || Date.now() - last > STALE_MS) sync.mutate({})
  }, [status.isLoading, status.data, calendars.isLoading, sync])
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const rows = useMemo(() => {
    const visible = new Map((calendars.data ?? []).filter((c) => c.visible).map((c) => [c.id, c.color ?? undefined]))
    return (events.data ?? []).filter((e) => visible.has(e.calendar_id))
  }, [events.data, calendars.data])

  const display = useMemo(() => {
    const colors = new Map((calendars.data ?? []).map((c) => [c.id, c.color ?? undefined]))
    const list = buildEvents(rows, (id) => colors.get(id), from, to)
    if (cfg.show_deadlines) {
      const sc = new Map((subjects.data ?? []).map((x) => [x.id, x.color ?? undefined]))
      list.push(...deadlineEvents(deadlines.data ?? [], (id) => (id ? sc.get(id) : undefined)))
    }
    return list
  }, [rows, calendars.data, from, to, cfg.show_deadlines, deadlines.data, subjects.data])

  const rowById = useMemo(() => new Map<string, EventRow>(rows.map((r) => [r.id, r])), [rows])
  const days = view === 'week' ? weekOf(anchor, cfg.first_day) : [anchor]
  const byDay = groupByDay(display, days)

  const open = (ev: DisplayEvent) => {
    if (ev.kind === 'deadline') return navigate('/agenda/uni')
    const row = rowById.get(ev.id)
    if (row) setTarget({ mode: 'edit', row })
  }

  const title = view === 'month' ? formatMonthYear(anchor) : view === 'week' ? formatWeekRange(from, to) : formatLongDate(anchor)

  const doSync = async () => {
    try {
      const r = await sync.mutateAsync({ force: true })
      toast(r.changed ? `Sincronizado: ${r.changed} eventos actualizados` : 'Calendario al día')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se ha podido sincronizar', 'error')
    }
  }

  const last = status.data?.lastSyncedAt
  const noCalendars = !calendars.isLoading && (calendars.data ?? []).length === 0

  return (
    <div className={s.stack}>
      <div className={s.inline}>
        <div className={s.grow}>
          <SegmentedControl label="Vista del calendario" options={VIEWS} value={view} onChange={setView} />
        </div>
        <button type="button" className={`btn ${s.accentBtn}`} onClick={() => setTarget({ mode: 'new', date: anchor })}>
          <Plus size={20} /> Evento
        </button>
      </div>

      <div className={s.toolbar}>
        <button type="button" className={s.iconBtn} onClick={() => setAnchor(shiftAnchor(view, anchor, -1))} aria-label="Anterior">
          <ChevronLeft size={22} />
        </button>
        <h2 className={s.period} aria-live="polite">
          {title}
        </h2>
        <button type="button" className={s.iconBtn} onClick={() => setAnchor(shiftAnchor(view, anchor, 1))} aria-label="Siguiente">
          <ChevronRight size={22} />
        </button>
        <button type="button" className="btn btn-plain" onClick={() => setAnchor(today)} disabled={anchor === today && view !== 'month'}>
          Hoy
        </button>
      </div>

      <div className={s.syncRow}>
        <span className={`${s.syncText} ${status.data?.lastError ? s.syncError : ''}`} role="status">
          {sync.isPending
            ? 'Sincronizando…'
            : status.data?.lastError
              ? 'Error al sincronizar con iCloud'
              : last
                ? `Sincronizado ${formatAgo(last, now)}`
                : 'Sin sincronizar todavía'}
        </span>
        <button type="button" className="btn btn-plain" onClick={doSync} disabled={sync.isPending}>
          Sincronizar
        </button>
      </div>

      {noCalendars ? (
        <Card>
          <EmptyState
            title="Aún no hay calendarios"
            text="Abre los ajustes de Agenda (rueda) y pulsa «Descubrir calendarios» para traer los de iCloud."
          />
        </Card>
      ) : view === 'month' ? (
        <MonthView
          anchor={anchor}
          today={today}
          firstDay={cfg.first_day}
          events={display}
          onPickDay={(d) => {
            setAnchor(d)
            setView('day')
          }}
        />
      ) : (
        <DayList
          days={days}
          today={today}
          byDay={byDay}
          onOpen={open}
          onAdd={(d) => setTarget({ mode: 'new', date: d })}
        />
      )}
      {view === 'month' && !noCalendars && (
        <p className={s.small} style={{ margin: 0 }}>
          Toca un día para ver sus eventos.
        </p>
      )}

      <EventSheet target={target} calendars={calendars.data ?? []} onClose={() => setTarget(null)} />
    </div>
  )
}
