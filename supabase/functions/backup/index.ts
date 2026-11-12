// Edge Function `backup`: exporta TODAS las tablas de datos como JSON { exported_at, tables }.
// La lanza el workflow semanal `backup.yml` (GitHub Actions) con la cabecera `x-backup-secret`.
// Secrets de Supabase: BACKUP_SECRET (y los automáticos SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).
// Incluye songs.lyrics: el destino es un repo privado. verify_jwt = false (ver config.toml); la auth es el secreto.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildBackup, secretsEqual } from '../_shared/backup.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') return json({ error: 'Método no permitido' }, 405)

  const expected = Deno.env.get('BACKUP_SECRET') ?? ''
  const given = req.headers.get('x-backup-secret') ?? ''
  // Sin secret configurado o con uno corto no se acepta nada (evita abrir la función por error).
  if (expected.length < 16) return json({ error: 'BACKUP_SECRET no está configurado en Supabase' }, 500)
  if (!(await secretsEqual(given, expected))) return json({ error: 'No autorizado' }, 401)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const backup = await buildBackup(async (table, from, to) => {
      // Orden por id: la paginación por rangos necesita un orden estable.
      const { data, error } = await db.from(table).select('*').order('id').range(from, to)
      if (error) throw new Error(`${table}: ${error.message}`)
      return data ?? []
    })
    return json(backup)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Error al exportar' }, 500)
  }
})
