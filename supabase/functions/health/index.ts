// Edge Function `health`: recibe entrenos de Apple Salud desde un Atajo de iOS (una web no puede leer HealthKit).
// POST con la cabecera `x-health-token` (secret HEALTH_TOKEN) y un JSON como
//   { "workouts": [ { "start": ISO, "end"?: ISO, "duration_min"?: n, "type"?: texto, "active_kcal": n|"n,n" } ],
//     "active_kcal_day"?: { "date": "YYYY-MM-DD", "kcal": n } }
// Escribe `watch_kcal` en `workouts` (ver la lógica y sus decisiones en _shared/health.ts).
// verify_jwt = false (ver config.toml): la auth es el secreto, comparado en tiempo constante.
// Secrets: HEALTH_TOKEN (≥ 16 caracteres) y los automáticos SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { secretsEqual } from '../_shared/backup.ts'
import { aggregateByDay, parseHealthBody, planHealth, type ParsedHealth } from '../_shared/health.ts'

const MAX_BODY = 200_000

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido' }, 405)

  const expected = Deno.env.get('HEALTH_TOKEN') ?? ''
  // Sin secret configurado o con uno corto no se acepta nada (evita abrir la función por error).
  if (expected.length < 16)
    return json({ ok: false, error: 'HEALTH_TOKEN no está configurado en Supabase' }, 500)
  const given = req.headers.get('x-health-token') ?? ''
  if (!(await secretsEqual(given, expected))) return json({ ok: false, error: 'No autorizado' }, 401)

  try {
    const text = await req.text()
    if (text.length > MAX_BODY) return json({ ok: false, error: 'Cuerpo demasiado grande' }, 413)
    let parsed: ParsedHealth
    try {
      parsed = parseHealthBody(JSON.parse(text))
    } catch (e) {
      return json({ ok: false, error: e instanceof Error ? e.message : 'JSON no válido' }, 400)
    }

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    // Una sola persona usa la app (como en caldav con el cron): el usuario más antiguo.
    const { data: users, error: uerr } = await db.auth.admin.listUsers({ page: 1, perPage: 50 })
    if (uerr || !users.users.length) return json({ ok: false, error: 'No hay usuarios' }, 500)
    const userId = [...users.users].sort((a, b) => a.created_at.localeCompare(b.created_at))[0]!.id

    const dates = [
      ...new Set([
        ...aggregateByDay(parsed.workouts).map((d) => d.date),
        ...(parsed.dayKcal ? [parsed.dayKcal.date] : []),
      ]),
    ]
    if (!dates.length) return json({ ok: true, updated: 0, created: 0, skipped: parsed.skipped })

    const { data: existing, error: qerr } = await db
      .from('workouts')
      .select('id, date, watch_kcal, duration_min')
      .eq('user_id', userId)
      .in('date', dates)
      .order('created_at')
    if (qerr) return json({ ok: false, error: qerr.message }, 500)

    let updated = 0
    let created = 0
    const plan = planHealth(
      parsed,
      (existing ?? []).map((w) => ({
        ...w,
        watch_kcal: w.watch_kcal === null ? null : Number(w.watch_kcal),
      })),
    )
    for (const a of plan) {
      const res =
        a.op === 'update'
          ? await db.from('workouts').update(a.patch).eq('id', a.id).eq('user_id', userId)
          : await db.from('workouts').insert({ ...a.row, user_id: userId })
      if (res.error) return json({ ok: false, error: res.error.message }, 500)
      if (a.op === 'update') updated++
      else created++
    }
    return json({ ok: true, updated, created, skipped: parsed.skipped })
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'Error' }, 500)
  }
})
