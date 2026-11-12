import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { markOffline } from './connectivity'
import { isAuthExpired, isNetworkError, retryDelay, retryPolicy } from './errors'
import { OFFLINE_ROOT, OFFLINE_SCOPE, type OfflineKey } from './keys'
import { ensureSession, refreshSession } from './session'

export type OfflineSpec<V> = {
  key: OfflineKey
  /** Escritura contra Supabase. Debe ser idempotente (IDs del cliente + upsert ignorando duplicados). */
  run: (v: V) => Promise<unknown>
  /** Refleja el cambio en la caché al instante (también sin red). */
  optimistic?: (qc: QueryClient, v: V) => void
  /** Consultas que se refrescan al terminar la última escritura pendiente. */
  invalidate: readonly QueryKey[]
}

/**
 * Registra los valores por defecto de una mutación offline. Las funciones no se pueden persistir, así
 * que TanStack las recupera por `mutationKey` al restaurar las mutaciones pausadas tras recargar.
 * Debe ejecutarse ANTES de restaurar la caché persistida.
 */
export function defineOffline<V>(qc: QueryClient, spec: OfflineSpec<V>) {
  const refresh = () => Promise.all(spec.invalidate.map((queryKey) => qc.invalidateQueries({ queryKey })))
  qc.setMutationDefaults(spec.key, {
    mutationFn: async (v: unknown) => {
      await ensureSession()
      try {
        await spec.run(v as V)
      } catch (e) {
        if (isNetworkError(e)) markOffline()
        else if (isAuthExpired(e)) await refreshSession()
        throw e
      }
    },
    scope: OFFLINE_SCOPE,
    networkMode: 'online', // sin red se pausa (y se persiste) en vez de fallar
    gcTime: Infinity, // las fallidas se quedan hasta que el usuario las descarte
    retry: retryPolicy,
    retryDelay,
    onMutate: async (v: unknown) => {
      await Promise.all(spec.invalidate.map((queryKey) => qc.cancelQueries({ queryKey })))
      spec.optimistic?.(qc, v as V)
    },
    // Solo la última escritura pendiente refresca: antes, una recarga pisaría lo apuntado sin enviar.
    // Si falló por un motivo no transitorio, el refresco también deshace el cambio optimista.
    onSettled: async () => {
      if (qc.isMutating({ mutationKey: OFFLINE_ROOT }) <= 1) await refresh()
    },
  })
}
