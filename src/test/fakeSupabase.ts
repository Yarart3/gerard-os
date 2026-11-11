// Cliente de Supabase falso para tests de componentes: cualquier consulta encadenada
// resuelve sin filas (listas vacías; null en .single()/.maybeSingle()).
type Result = { data: unknown; error: null }

function chain(result: Result): unknown {
  const target = () => {}
  return new Proxy(target, {
    get(_t, prop) {
      if (prop === 'then') return (resolve: (r: Result) => void) => resolve(result)
      if (prop === 'single' || prop === 'maybeSingle') return () => chain({ data: null, error: null })
      return () => chain(result)
    },
  })
}

export const fakeSupabase = {
  from: () => chain({ data: [], error: null }),
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: async () => ({ error: null }),
  },
}
