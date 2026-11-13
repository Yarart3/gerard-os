import { Card, ListRow } from '../components/ui'
import { Film, Gear, Note, Speech, Wallet } from '../components/ui/icons'
import { formatEuros } from '../lib/format'
import { usePersonalSummary } from '../features/personal/api'

/** «Más»: lo que se usa menos a menudo (Inglés y Personal) y los Ajustes. */
export default function MoreScreen() {
  const p = usePersonalSummary()
  return (
    <>
      <Card flush>
        <ListRow icon={<Speech size={22} />} title="Inglés" subtitle="Racha, vocabulario y lecciones" to="/ingles" />
      </Card>
      <Card title="Personal" flush>
        <ListRow
          icon={<Wallet size={22} />}
          title="Gastos"
          subtitle={
            p.isLoading
              ? undefined
              : p.monthBudget
                ? `${formatEuros(p.monthSpent)} de ${formatEuros(p.monthBudget)} este mes`
                : `${formatEuros(p.monthSpent)} este mes`
          }
          to="/personal"
        />
        <ListRow
          icon={<Film size={22} />}
          title="Watchlist"
          subtitle={p.isLoading ? undefined : `${p.watchPending} pendientes`}
          to="/personal/watchlist"
        />
        <ListRow icon={<Note size={22} />} title="Notas" to="/personal/notas" />
      </Card>
      <Card flush>
        <ListRow icon={<Gear size={22} />} title="Ajustes" subtitle="Perfil, tema, objetivos, iCloud, IA…" to="/ajustes" />
      </Card>
    </>
  )
}
