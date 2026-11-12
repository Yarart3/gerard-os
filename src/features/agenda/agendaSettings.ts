import { useSectionSettings } from '../settings/useSettings'
import type { FirstDay } from './logic/grid'

export type AgendaSettings = {
  first_day: FirstDay // 1 = lunes, 7 = domingo
  show_deadlines: boolean // entregas y exámenes en el calendario (solo en la app)
  deadline_alert_days: number // desde cuántos días antes se resalta una entrega
}

export const AGENDA_DEFAULTS: AgendaSettings = {
  first_day: 1,
  show_deadlines: true,
  deadline_alert_days: 3,
}

export function useAgendaSettings() {
  const s = useSectionSettings<AgendaSettings>('agenda', AGENDA_DEFAULTS)
  return { ...s, value: { ...AGENDA_DEFAULTS, ...s.value } }
}
