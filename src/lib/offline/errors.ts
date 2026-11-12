import { onlineManager } from '@tanstack/react-query'

/** Fallo de red (sin conexión, DNS, timeout…): la escritura se reintenta, nunca se descarta. */
export class NetworkError extends Error {
  constructor(message = 'Sin conexión') {
    super(message)
    this.name = 'NetworkError'
  }
}

/** El token ha caducado (401): se refresca la sesión y se reintenta. */
export class AuthExpiredError extends Error {
  constructor(message = 'Sesión caducada') {
    super(message)
    this.name = 'AuthExpiredError'
  }
}

type Failure = { message?: string; code?: string; name?: string; status?: number } | null | undefined

const NETWORK_RE =
  /failed to fetch|networkerror|network request failed|load failed|fetch failed|internet connection|network connection was lost/i

export function isNetworkError(e: unknown): boolean {
  if (e instanceof NetworkError) return true
  const f = e as Failure
  return Boolean(f && (f.name === 'AuthRetryableFetchError' || (f.message && NETWORK_RE.test(f.message))))
}

export function isAuthExpired(e: unknown): boolean {
  if (e instanceof AuthExpiredError) return true
  const f = e as Failure
  return Boolean(
    f && (f.code === 'PGRST301' || f.status === 401 || (f.message && /jwt expired/i.test(f.message))),
  )
}

/** Convierte un error de Supabase en una excepción tipada (red / sesión / otro). */
export function fail(error: Failure): void {
  if (!error) return
  const message = error.message ?? 'Error desconocido'
  if (isNetworkError(error)) throw new NetworkError(message)
  if (isAuthExpired(error)) throw new AuthExpiredError(message)
  const err = new Error(message) as Error & { code?: string }
  err.code = error.code
  throw err
}

/** Reintentos de la cola: los fallos de red sin límite (con espera creciente); la sesión caducada 2 veces. */
export function retryPolicy(failureCount: number, error: unknown): boolean {
  if (isNetworkError(error)) return true
  if (isAuthExpired(error)) return failureCount < 2
  return false
}

export const retryDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, 30_000)

export const isOnline = () => onlineManager.isOnline()
