import { QueryClient } from '@tanstack/react-query'

// offlineFirst: sin red, las peticiones pasan igualmente por el service worker,
// que responde con la última copia en caché (lectura offline).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, networkMode: 'offlineFirst', refetchOnWindowFocus: true },
    mutations: { networkMode: 'offlineFirst' },
  },
})
