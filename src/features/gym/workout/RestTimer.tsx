import { useEffect, useState } from 'react'
import { Close, Timer } from '../../../components/ui/icons'
import { formatDuration } from '../../../lib/format'
import s from '../Gym.module.css'

/** Cuenta atrás del descanso entre series. `endsAt` en ms; null = oculto. */
export function RestTimer({ endsAt, onDone }: { endsAt: number | null; onDone: () => void }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (endsAt === null) return
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= endsAt) {
        onDone()
        if ('vibrate' in navigator) navigator.vibrate?.(200)
      }
    }, 250)
    return () => clearInterval(id)
  }, [endsAt, onDone])
  if (endsAt === null) return null
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000))
  return (
    <div className={s.timer} role="timer" aria-label="Descanso">
      <Timer size={20} />
      Descanso {formatDuration(left)}
      <button type="button" className={s.iconBtn} aria-label="Saltar descanso" onClick={onDone}>
        <Close size={18} />
      </button>
    </div>
  )
}
