import { ExpensesTab } from './ExpensesTab'
import { NotesTab } from './NotesTab'
import { WatchlistTab } from './WatchlistTab'

/** Contenido de Personal según el apartado (Gastos · Watchlist · Notas). */
export default function PersonalScreen({ sub }: { sub: string }) {
  if (sub === 'watchlist') return <WatchlistTab />
  if (sub === 'notas') return <NotesTab />
  return <ExpensesTab />
}
