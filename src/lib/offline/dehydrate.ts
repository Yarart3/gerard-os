import { defaultShouldDehydrateQuery, type Mutation, type Query } from '@tanstack/react-query'
import { OFFLINE_ROOT } from './keys'

/** Persiste solo las escrituras sin enviar (pausadas o en vuelo). Las fallidas no se reenvían solas. */
export function shouldDehydrateMutation(m: Mutation): boolean {
  return m.state.status === 'pending' && m.options.mutationKey?.[0] === OFFLINE_ROOT[0]
}

/** Consultas con datos, salvo el estado de la IA (no tiene sentido sin red ni tras reabrir). */
export function shouldDehydrateQuery(q: Query): boolean {
  return defaultShouldDehydrateQuery(q) && q.queryKey[1] !== 'ai-status'
}
