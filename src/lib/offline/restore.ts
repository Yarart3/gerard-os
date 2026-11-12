import type { QueryClient } from '@tanstack/react-query'
import { OFFLINE_ROOT } from './keys'

const noop = () => {}

/**
 * Reanuda la cola tras restaurar la caché o al volver la red. Se continúan todas las pendientes (no solo
 * las pausadas: una que iba en vuelo al cerrar la app se reenvía, es idempotente). Comparten ámbito, así
 * que se ejecutan una a una en el orden en que se crearon.
 */
export function resumeOfflineQueue(qc: QueryClient) {
  const pending = qc.getMutationCache().findAll({ mutationKey: OFFLINE_ROOT, status: 'pending' })
  void qc.resumePausedMutations().catch(noop)
  for (const m of pending) void m.continue().catch(noop)
}
