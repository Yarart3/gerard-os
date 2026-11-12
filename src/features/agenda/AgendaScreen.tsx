import { CalendarTab } from './calendar/CalendarTab'
import { UniTab } from './uni/UniTab'

/** Contenido de Agenda según el apartado (Calendario · Uni). */
export default function AgendaScreen({ sub }: { sub: string }) {
  return sub === 'uni' ? <UniTab /> : <CalendarTab />
}
