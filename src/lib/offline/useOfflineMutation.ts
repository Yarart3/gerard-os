import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import type { OfflineKey } from './keys'

/**
 * Espera a que la mutación termine O quede en cola (pausada por falta de red / turno), lo que ocurra
 * antes. Así los formularios se cierran al instante sin red en lugar de quedarse esperando.
 */
function settledOrQueued<T>(qc: QueryClient, vars: unknown, start: () => Promise<T>): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const unsub = qc.getMutationCache().subscribe((ev) => {
      if (ev.type !== 'updated' || ev.mutation.state.variables !== vars) return
      const a = ev.action
      if (a.type === 'pause' || (a.type === 'pending' && a.isPaused)) {
        unsub()
        resolve(undefined)
      }
    })
    start().then(
      (v) => (unsub(), resolve(v)),
      (e) => (unsub(), reject(e)),
    )
  })
}

/**
 * Mutación de la cola offline. `prepare` fija los IDs y valores dependientes del momento (fechas, posiciones)
 * ANTES de encolar, para que un reintento envíe exactamente lo mismo.
 * La lógica (mutationFn, optimista, refresco) vive en `defineOffline`, registrada por `mutationKey`.
 */
export function useOfflineMutation<V, P = V>(key: OfflineKey, prepare?: (v: V, qc: QueryClient) => P) {
  const qc = useQueryClient()
  const m = useMutation<unknown, Error, P>({ mutationKey: key })
  const { mutate, mutateAsync } = m
  const prep = useCallback((v: V) => (prepare ? prepare(v, qc) : (v as unknown as P)), [prepare, qc])
  const run = useCallback(
    (v: V) => {
      const vars = prep(v)
      return settledOrQueued(qc, vars, () => mutateAsync(vars))
    },
    [prep, qc, mutateAsync],
  )
  const fire = useCallback((v: V) => mutate(prep(v)), [prep, mutate])
  return useMemo(
    () => ({
      mutate: fire,
      mutateAsync: run,
      // En cola ≠ "guardando": no bloquea botones mientras espera a la red.
      isPending: m.isPending && !m.isPaused,
      isError: m.isError,
      error: m.error,
    }),
    [fire, run, m.isPending, m.isPaused, m.isError, m.error],
  )
}
