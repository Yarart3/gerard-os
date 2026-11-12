import { useSyncExternalStore } from 'react'
import { subscribeDayCutoff, todayISO } from './dates'

// Cada minuto se vuelve a comprobar el día (cruce de la hora de corte con la app abierta).
function subscribe(cb: () => void) {
  const unsub = subscribeDayCutoff(cb)
  const t = setInterval(cb, 60_000)
  return () => {
    unsub()
    clearInterval(t)
  }
}

/** "Hoy" del usuario (con hora de corte). Se actualiza al cambiar el ajuste o al cruzar el corte. */
export function useToday(): string {
  return useSyncExternalStore(subscribe, () => todayISO())
}
