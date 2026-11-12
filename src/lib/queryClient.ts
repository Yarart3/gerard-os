import { MutationCache, QueryClient } from '@tanstack/react-query'
import { OFFLINE_ROOT } from './offline/keys'

const WEEK = 1000 * 60 * 60 * 24 * 7

export function createQueryClient() {
  const mutationCache: MutationCache = new MutationCache({
    // Las escrituras de la cola ya enviadas se retiran (las fallidas se quedan para poder descartarlas).
    // Se hace tras el turno actual: `onSettled` aún cuenta las pendientes, incluida la propia.
    onSettled: (_d, error, _v, _c, mutation) => {
      if (!error && mutation.options.mutationKey?.[0] === OFFLINE_ROOT[0])
        setTimeout(() => mutationCache.remove(mutation), 0)
    },
  })
  return new QueryClient({
    mutationCache,
    defaultOptions: {
      // 'online' (por defecto): sin red las consultas se pausan y conservan lo que hay en caché
      // (restaurado de IndexedDB), incluidos los cambios optimistas aún sin enviar.
      // gcTime = maxAge de la caché persistida, o se descartaría lo no visitado hace más de 5 min.
      queries: { staleTime: 30_000, retry: 1, gcTime: WEEK, refetchOnWindowFocus: true },
      // Las escrituras que NO están en la cola (catálogo, ajustes, Agenda…) fallan al momento sin red.
      mutations: { networkMode: 'offlineFirst' },
    },
  })
}

export const queryClient = createQueryClient()
