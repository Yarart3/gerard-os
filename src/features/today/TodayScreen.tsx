import { Card, EmptyState } from '../../components/ui'
import { visibleCards } from './logic/cards'
import { TodayCard } from './TodayCards'
import { useTodaySettings } from './todaySettings'
import s from './Today.module.css'

/** Pantalla Hoy: las tarjetas activadas, en el orden configurado. */
export default function TodayScreen() {
  const { value, isLoading } = useTodaySettings()
  const ids = visibleCards(value.cards)
  if (!isLoading && ids.length === 0)
    return (
      <Card>
        <EmptyState title="Sin tarjetas" text="Actívalas con «Ajustar» (arriba a la derecha)." />
      </Card>
    )
  return (
    <div className={s.stack}>
      {ids.map((id) => (
        <TodayCard key={id} id={id} />
      ))}
    </div>
  )
}
