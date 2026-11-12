import { onlineManager } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

const subscribe = (cb: () => void) => onlineManager.subscribe(cb)

/** Estado de red actual (el mismo que usa TanStack Query para pausar mutaciones). */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => onlineManager.isOnline(),
    () => true,
  )
}

let probe: ReturnType<typeof setInterval> | undefined

/**
 * onlineManager arranca en "online" y solo cambia con los eventos online/offline del navegador, que
 * pueden faltar (p. ej. al abrir la PWA ya en modo avión). Se alinea con `navigator.onLine` al
 * arrancar y, si una petición falla por red, se marca sin conexión y se sondea hasta que vuelva.
 */
export function initConnectivity() {
  if (typeof navigator !== 'undefined') onlineManager.setOnline(navigator.onLine)
}

export function markOffline(probeUrl: string | undefined = import.meta.env.VITE_SUPABASE_URL) {
  onlineManager.setOnline(false)
  if (probe || !probeUrl || typeof fetch === 'undefined') return
  const check = async () => {
    try {
      // Cualquier respuesta HTTP (incluso un error) significa que hay red.
      await fetch(`${probeUrl}/auth/v1/health`, {
        cache: 'no-store',
        headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '' },
      })
      stopProbe()
      onlineManager.setOnline(true)
    } catch {
      /* sigue sin red */
    }
  }
  probe = setInterval(check, 8000)
}

export function stopProbe() {
  if (probe) clearInterval(probe)
  probe = undefined
}
