import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client'
import { shouldDehydrateMutation, shouldDehydrateQuery } from './dehydrate'

// IndexedDB en lugar de localStorage: localStorage se queda en ~5 MB y el historial, las canciones
// con letra y las tarjetas lo pueden superar; además es asíncrono y no bloquea la interfaz.
// Un almacén clave-valor mínimo evita añadir otra dependencia (idb-keyval).
const DB_NAME = 'gerard-os'
const STORE = 'kv'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = run(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

export type KvStorage = {
  getItem: (k: string) => Promise<string | null>
  setItem: (k: string, v: string) => Promise<void>
  removeItem: (k: string) => Promise<void>
}

export const idbStorage: KvStorage = {
  getItem: async (k) => (await tx<string | undefined>('readonly', (s) => s.get(k))) ?? null,
  setItem: async (k, v) => void (await tx('readwrite', (s) => s.put(v, k))),
  removeItem: async (k) => void (await tx('readwrite', (s) => s.delete(k))),
}

/** Sin IndexedDB (modo privado antiguo, tests): no persiste, la app sigue funcionando. */
const noStorage: KvStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
}

export const CACHE_KEY = 'gerard-os-query-cache'
// Caduca igual que la copia del service worker. Cambiar BUSTER descarta también la cola pendiente:
// solo debe subirse si cambia la forma de las variables de las mutaciones o de la caché.
export const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7
export const CACHE_BUSTER = 'v1'

export function createPersister(
  storage: KvStorage | undefined = typeof indexedDB === 'undefined' ? noStorage : idbStorage,
) {
  return createAsyncStoragePersister({
    storage: storage ?? noStorage,
    key: CACHE_KEY,
    throttleTime: 100, // guarda casi al momento: si iOS cierra la PWA no se pierde lo apuntado
  })
}

export const persister = createPersister()

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: CACHE_MAX_AGE,
  buster: CACHE_BUSTER,
  dehydrateOptions: { shouldDehydrateMutation, shouldDehydrateQuery },
}

/** Borra la copia persistida (cierre de sesión). */
export const clearPersistedCache = () => persister.removeClient()
