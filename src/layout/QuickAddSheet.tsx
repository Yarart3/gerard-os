import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, ListRow, Sheet } from '../components/ui'
import { Dumbbell, Fork, Note, Wallet } from '../components/ui/icons'
import { useToday } from '../lib/useToday'
import { useActiveWorkout, useStartWorkout } from '../features/gym/api'
import { useGymSettings } from '../features/gym/gymSettings'
import { defaultTitle } from '../features/gym/logic/session'
import { AddItemSheet } from '../features/nutrition/DiaryView'
import { ExpenseSheet } from '../features/personal/ExpenseSheet'
import { monthOf } from '../features/personal/logic/expenses'
import { suggestedSlot } from '../features/nutrition/logic/slots'
import { NoteSheet } from '../features/personal/NoteSheet'
import { usePersonalSettings } from '../features/personal/personalSettings'
import s from './QuickAdd.module.css'

type Mode = 'menu' | 'meal' | 'expense' | 'note' | { slot: string }

export default function QuickAddSheet({ onClose }: { onClose: () => void }) {
  const today = useToday()
  const navigate = useNavigate()
  const { value: cfg } = useGymSettings()
  const personal = usePersonalSettings()
  const active = useActiveWorkout()
  const start = useStartWorkout()
  const [mode, setMode] = useState<Mode>('menu')
  const slots = cfg.nutrition.slots
  const suggested = suggestedSlot(slots)

  if (typeof mode === 'object') return <AddItemSheet date={today} slot={mode.slot} onClose={onClose} />
  if (mode === 'expense') return <ExpenseSheet expense="new" defaultMonth={monthOf(today)} onClose={onClose} />
  if (mode === 'note') return <NoteSheet note="new" suggestions={personal.value.note_tags} onClose={onClose} />

  const workout = () => {
    if (!active.data) start.mutate({ date: today, title: defaultTitle() })
    onClose()
    navigate('/entreno')
  }

  return (
    <Sheet open onClose={onClose} title="Apuntar">
      <Card flush>
        <ListRow
          icon={<Fork size={22} />}
          title="Comida"
          subtitle={suggested ? `Ahora toca: ${suggested}` : undefined}
          onClick={() => setMode(mode === 'meal' ? 'menu' : 'meal')}
        />
        {mode === 'meal' && (
          <div className={s.slots} role="group" aria-label="¿A qué comida?">
            {[...slots]
              .sort((a, b) => (a === suggested ? -1 : b === suggested ? 1 : 0))
              .map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={`${s.slot} ${slot === suggested ? s.suggested : ''}`}
                  onClick={() => setMode({ slot })}
                >
                  {slot}
                </button>
              ))}
          </div>
        )}
        <ListRow
          icon={<Dumbbell size={22} />}
          title={active.data ? 'Seguir entreno' : 'Empezar entreno'}
          subtitle={active.data ? (active.data.title ?? 'En curso') : undefined}
          onClick={workout}
        />
        <ListRow icon={<Wallet size={22} />} title="Gasto" onClick={() => setMode('expense')} />
        <ListRow icon={<Note size={22} />} title="Nota" onClick={() => setMode('note')} />
      </Card>
    </Sheet>
  )
}
