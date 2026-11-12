import { useMemo } from 'react'
import { useAgendaSettings } from './agendaSettings'
import { useCalendars, useDeadlines, useEvents, useSubjects } from './api'
import { buildEvents, deadlineEvents, eventsOnDay, type DisplayEvent } from './logic/events'

/** Eventos de iCloud visibles y entregas de un día, listos para pintar (reutiliza las consultas del calendario). */
export function useDayEvents(day: string): { events: DisplayEvent[]; isLoading: boolean } {
  const { value: cfg } = useAgendaSettings()
  const calendars = useCalendars()
  const events = useEvents(day, day)
  const deadlines = useDeadlines()
  const subjects = useSubjects()

  const list = useMemo(() => {
    const colors = new Map((calendars.data ?? []).map((c) => [c.id, c.color ?? undefined]))
    const visible = new Set((calendars.data ?? []).filter((c) => c.visible).map((c) => c.id))
    const rows = (events.data ?? []).filter((e) => visible.has(e.calendar_id))
    const all = buildEvents(rows, (id) => colors.get(id), day, day)
    if (cfg.show_deadlines) {
      const sc = new Map((subjects.data ?? []).map((x) => [x.id, x.color ?? undefined]))
      all.push(...deadlineEvents(deadlines.data ?? [], (id) => (id ? sc.get(id) : undefined)))
    }
    return eventsOnDay(all, day)
  }, [calendars.data, events.data, deadlines.data, subjects.data, cfg.show_deadlines, day])

  return { events: list, isLoading: calendars.isLoading || events.isLoading }
}
