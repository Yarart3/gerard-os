import { supabase } from '../supabase'
import { AuthExpiredError, NetworkError, isNetworkError } from './errors'

/**
 * Antes de cada escritura de la cola: `getSession()` refresca el token si ha caducado (puede haber
 * caducado mientras no había red). Sin red lanza NetworkError (se reintenta); sin sesión, AuthExpiredError.
 */
export async function ensureSession(): Promise<void> {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    if (isNetworkError(error)) throw new NetworkError(error.message)
    throw new AuthExpiredError(error.message)
  }
  if (!data.session) throw new AuthExpiredError()
}

/** Tras un 401: fuerza un refresco del token para que el reintento use uno válido. */
export async function refreshSession(): Promise<void> {
  const { error } = await supabase.auth.refreshSession()
  if (error && isNetworkError(error)) throw new NetworkError(error.message)
}
