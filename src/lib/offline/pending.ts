import { useMutationState, type QueryClient } from '@tanstack/react-query'
import { OFFLINE_ROOT } from './keys'

/** Cambios en cola (pendientes o enviándose) y fallidos de forma permanente. */
export function usePendingChanges() {
  const statuses = useMutationState({
    filters: { mutationKey: OFFLINE_ROOT },
    select: (m) => m.state.status,
  })
  const queued = statuses.filter((s) => s === 'pending').length
  const failed = statuses.filter((s) => s === 'error').length
  return { queued, failed, unsynced: queued + failed }
}

export function countUnsynced(qc: QueryClient): number {
  return qc
    .getMutationCache()
    .findAll({ mutationKey: OFFLINE_ROOT })
    .filter((m) => m.state.status === 'pending' || m.state.status === 'error').length
}

/** Quita de la cola las escrituras fallidas y recarga los datos reales (deshace lo optimista). */
export function discardFailed(qc: QueryClient) {
  const cache = qc.getMutationCache()
  for (const m of cache.findAll({ mutationKey: OFFLINE_ROOT, status: 'error' })) cache.remove(m)
  return qc.invalidateQueries()
}

export const unsyncedWarning = (n: number) =>
  `Tienes ${n} ${n === 1 ? 'cambio sin sincronizar' : 'cambios sin sincronizar'}; si cierras sesión se perderán. ¿Cerrar sesión igualmente?`

export const savedText = (n: number) => (n === 1 ? '1 cambio guardado' : `${n} cambios guardados`)
export const pendingText = (n: number) =>
  `Sin conexión · ${n === 1 ? '1 cambio pendiente' : `${n} cambios pendientes`}`
