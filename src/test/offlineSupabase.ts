// Supabase falso para probar la cola offline: registra cada llamada y simula un "servidor" idempotente.
export type Call = {
  table: string
  op: 'select' | 'upsert' | 'update' | 'delete' | 'insert'
  payload?: unknown
  opts?: { onConflict?: string; ignoreDuplicates?: boolean }
  filters: [string, unknown][]
}
type Reply = { data: unknown; error: { message: string; code?: string } | null }

export const server = {
  calls: [] as Call[],
  /** Filas guardadas por tabla e id: un upsert con el mismo id no duplica. */
  rows: new Map<string, Map<string, Record<string, unknown>>>(),
  /** Errores a devolver (uno por llamada de escritura, en orden). */
  failNext: [] as ({ message: string; code?: string } | null)[],
  /** Respuesta de los select. */
  onSelect: ((): unknown => []) as (c: Call) => unknown,
  sessionCalls: 0,
  refreshCalls: 0,
  reset() {
    this.calls = []
    this.rows = new Map()
    this.failNext = []
    this.onSelect = () => []
    this.sessionCalls = 0
    this.refreshCalls = 0
  },
  table(name: string) {
    if (!this.rows.has(name)) this.rows.set(name, new Map())
    return this.rows.get(name)!
  },
}

function run(call: Call): Reply {
  server.calls.push({ ...call, filters: [...call.filters] })
  if (call.op === 'select') return { data: server.onSelect(call), error: null }
  const err = server.failNext.length ? server.failNext.shift()! : null
  if (err) return { data: null, error: err }
  const t = server.table(call.table)
  const list = (Array.isArray(call.payload) ? call.payload : [call.payload]) as Record<string, unknown>[]
  if (call.op === 'upsert' || call.op === 'insert') {
    for (const r of list) {
      const id = r.id as string
      if (call.opts?.ignoreDuplicates && t.has(id)) continue
      t.set(id, { ...(t.get(id) ?? {}), ...r })
    }
  } else if (call.op === 'update') {
    const id = call.filters.find(([c]) => c === 'id')?.[1] as string
    if (t.has(id)) t.set(id, { ...t.get(id)!, ...(call.payload as object) })
  } else if (call.op === 'delete') {
    t.delete(call.filters.find(([c]) => c === 'id')?.[1] as string)
  }
  return { data: null, error: null }
}

function from(table: string) {
  const call: Call = { table, op: 'select', filters: [] }
  const b: Record<string, unknown> = {
    select: () => b,
    upsert: (payload: unknown, opts?: Call['opts']) => (
      (call.op = 'upsert'),
      (call.payload = payload),
      (call.opts = opts),
      b
    ),
    insert: (payload: unknown) => ((call.op = 'insert'), (call.payload = payload), b),
    update: (payload: unknown) => ((call.op = 'update'), (call.payload = payload), b),
    delete: () => ((call.op = 'delete'), b),
    eq: (c: string, v: unknown) => (call.filters.push([c, v]), b),
    gte: (c: string, v: unknown) => (call.filters.push([c, v]), b),
    single: () => b,
    then: (resolve: (r: Reply) => void) => resolve(run(call)),
  }
  return b
}

export const fakeOfflineSupabase = {
  from,
  auth: {
    getSession: async () => {
      server.sessionCalls++
      return { data: { session: { user: { id: 'u' } } }, error: null }
    },
    refreshSession: async () => {
      server.refreshCalls++
      return { data: {}, error: null }
    },
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: vi.fn(async () => ({ error: null })),
  },
}
