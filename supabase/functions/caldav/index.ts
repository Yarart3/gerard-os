// Edge Function `caldav`: puente entre la app e iCloud (CalDAV), implementado con fetch + XML a mano.
// Acciones (POST JSON { action, ... }): test · discover · sync · create · update · delete.
// Auth: JWT del usuario, o cabecera `x-cron-secret` (solo para `sync`, lo lanza pg_cron).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  calendarQueryBody,
  calendarsBody,
  ctagBody,
  homeSetBody,
  multigetBody,
  parseCalendarData,
  parseCalendarHomeHref,
  parseCalendarList,
  parseCtag,
  parseEtags,
  parsePrincipalHref,
  principalBody,
  resolveHref,
} from '../_shared/caldavParse.ts'
import { parseIcs, pickMaster, serializeEvent, updateIcs, type EventInput } from '../_shared/ics.ts'

const ICLOUD = 'https://caldav.icloud.com/'
const SYNC_PAST_MS = 92 * 86_400_000 // ~3 meses atrás
const SYNC_FUTURE_MS = 366 * 86_400_000 // 12 meses adelante
const MULTIGET_BATCH = 30

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

class HandledError extends Error {
  constructor(
    message: string,
    public code: string,
    public status = 200,
  ) {
    super(message)
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

// ---------- Cliente CalDAV ----------

function authHeader(): string {
  const id = Deno.env.get('APPLE_ID')
  const pw = Deno.env.get('APPLE_APP_PASSWORD')
  if (!id || !pw) throw new HandledError('Faltan los secrets APPLE_ID y APPLE_APP_PASSWORD en Supabase', 'config')
  return 'Basic ' + btoa(unescape(encodeURIComponent(`${id}:${pw}`)))
}

type DavOpts = { body?: string; depth?: '0' | '1'; headers?: Record<string, string> }

/** Petición WebDAV. Sigue redirecciones a mano y solo enviando credenciales a *.icloud.com. */
async function dav(method: string, url: string, opts: DavOpts = {}): Promise<Response> {
  let target = url
  for (let hop = 0; hop < 5; hop++) {
    const u = new URL(target)
    if (u.protocol !== 'https:' || !(u.hostname === 'icloud.com' || u.hostname.endsWith('.icloud.com')))
      throw new Error('Destino no permitido')
    const headers: Record<string, string> = {
      Authorization: authHeader(),
      ...(opts.depth ? { Depth: opts.depth } : {}),
      ...(opts.body ? { 'Content-Type': 'application/xml; charset=utf-8' } : {}),
      ...opts.headers,
    }
    const res = await fetch(target, { method, headers, body: opts.body, redirect: 'manual' })
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      target = new URL(res.headers.get('location')!, target).href
      await res.body?.cancel()
      continue
    }
    if (res.status === 401 || res.status === 403)
      throw new HandledError('Credenciales de iCloud incorrectas', 'auth')
    return res
  }
  throw new HandledError('Demasiadas redirecciones de iCloud', 'upstream')
}

async function davXml(method: string, url: string, opts: DavOpts): Promise<string> {
  const res = await dav(method, url, opts)
  const text = await res.text()
  if (res.status !== 207 && !res.ok)
    throw new HandledError(`iCloud respondió ${res.status} a ${method}`, 'upstream')
  return text
}

type FoundCalendar = { url: string; name: string; color: string | null; ctag: string | null }

async function discoverCalendars(): Promise<FoundCalendar[]> {
  const principalUrl = parsePrincipalHref(await davXml('PROPFIND', ICLOUD, { depth: '0', body: principalBody }))
  if (!principalUrl) throw new HandledError('iCloud no devolvió la cuenta (principal)', 'upstream')
  const principal = resolveHref(ICLOUD, principalUrl)
  const homeHref = parseCalendarHomeHref(await davXml('PROPFIND', principal, { depth: '0', body: homeSetBody }))
  if (!homeHref) throw new HandledError('iCloud no devolvió el conjunto de calendarios', 'upstream')
  const home = resolveHref(principal, homeHref)
  const list = parseCalendarList(await davXml('PROPFIND', home, { depth: '1', body: calendarsBody }))
  return list.map((c) => ({ url: resolveHref(home, c.href), name: c.name, color: c.color, ctag: c.ctag }))
}

// ---------- Base de datos ----------

type Db = SupabaseClient
type CalendarRow = { id: string; caldav_url: string; name: string; user_id: string }

function check<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message)
  return r.data
}

async function upsertCalendars(db: Db, userId: string, found: FoundCalendar[]) {
  const existing = check(
    await db.from('calendars').select('id, caldav_url, is_default').eq('user_id', userId),
  ) as { id: string; caldav_url: string; is_default: boolean }[]
  const byUrl = new Map(existing.map((c) => [c.caldav_url, c]))
  let hasDefault = existing.some((c) => c.is_default)
  let added = 0
  for (const c of found) {
    const row = byUrl.get(c.url)
    if (row) {
      check(await db.from('calendars').update({ name: c.name }).eq('id', row.id))
    } else {
      const isDefault = !hasDefault
      hasDefault = true
      check(
        await db
          .from('calendars')
          .insert({ user_id: userId, caldav_url: c.url, name: c.name, color: c.color, is_default: isDefault }),
      )
      added++
    }
  }
  return { total: found.length, added }
}

// ---------- Sincronización ----------

type SyncResult = { calendar_id: string; skipped?: boolean; changed: number; deleted: number; error?: string }

async function syncCalendar(db: Db, cal: CalendarRow, force: boolean): Promise<SyncResult> {
  const result: SyncResult = { calendar_id: cal.id, changed: 0, deleted: 0 }
  const state = check(
    await db.from('sync_state').select('ctag').eq('calendar_id', cal.id).eq('user_id', cal.user_id).maybeSingle(),
  ) as { ctag: string | null } | null
  const saveState = async (patch: Record<string, unknown>) =>
    check(
      await db
        .from('sync_state')
        .upsert(
          { user_id: cal.user_id, calendar_id: cal.id, ...patch },
          { onConflict: 'user_id,calendar_id' },
        ),
    )
  try {
    const ctag = parseCtag(await davXml('PROPFIND', cal.caldav_url, { depth: '0', body: ctagBody }))
    if (!force && ctag && state?.ctag === ctag) {
      await saveState({ last_synced_at: new Date().toISOString(), last_error: null })
      return { ...result, skipped: true }
    }

    const now = Date.now()
    const inRange = parseEtags(
      await davXml('REPORT', cal.caldav_url, {
        depth: '1',
        body: calendarQueryBody({ fromMs: now - SYNC_PAST_MS, toMs: now + SYNC_FUTURE_MS }),
      }),
    ).map((e) => ({ ...e, href: resolveHref(cal.caldav_url, e.href) }))

    const local = check(
      await db.from('events').select('id, href, etag').eq('calendar_id', cal.id).eq('deleted', false),
    ) as { id: string; href: string | null; etag: string | null }[]
    const localByHref = new Map(local.filter((e) => e.href).map((e) => [e.href!, e]))

    const changed = inRange.filter((e) => localByHref.get(e.href)?.etag !== e.etag)
    for (let i = 0; i < changed.length; i += MULTIGET_BATCH) {
      const batch = changed.slice(i, i + MULTIGET_BATCH)
      const entries = parseCalendarData(
        await davXml('REPORT', cal.caldav_url, {
          depth: '1',
          body: multigetBody(batch.map((b) => new URL(b.href).pathname)),
        }),
      )
      const rows = []
      for (const en of entries) {
        const href = resolveHref(cal.caldav_url, en.href)
        const master = pickMaster(parseIcs(en.ics))
        if (!master) continue
        rows.push({
          user_id: cal.user_id,
          calendar_id: cal.id,
          uid: master.uid,
          href,
          etag: en.etag || batch.find((b) => b.href === href)?.etag || null,
          title: master.title,
          starts_at: master.starts_at,
          ends_at: master.ends_at,
          all_day: master.all_day,
          location: master.location,
          notes: master.notes,
          rrule: master.rrule,
          exdates: master.exdates,
          raw_ics: en.ics,
          deleted: false,
        })
      }
      if (rows.length) check(await db.from('events').upsert(rows, { onConflict: 'calendar_id,uid' }))
      result.changed += rows.length
    }

    // Borrados: eventos locales que ya no aparecen en el rango. Para no confundir "fuera del
    // rango" con "borrado", se confirma con un listado completo (solo etags, sin datos).
    const seen = new Set(inRange.map((e) => e.href))
    const missing = local.filter((e) => e.href && !seen.has(e.href))
    if (missing.length) {
      const all = new Set(
        parseEtags(
          await davXml('REPORT', cal.caldav_url, { depth: '1', body: calendarQueryBody({}) }),
        ).map((e) => resolveHref(cal.caldav_url, e.href)),
      )
      const gone = missing.filter((e) => !all.has(e.href!)).map((e) => e.id)
      if (gone.length) {
        check(await db.from('events').update({ deleted: true }).in('id', gone))
        result.deleted = gone.length
      }
    }
    await saveState({ ctag, last_synced_at: new Date().toISOString(), last_error: null })
    return result
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await saveState({ last_error: message }).catch(() => {})
    return { ...result, error: message }
  }
}

async function syncAll(db: Db, userId: string, calendarId: string | undefined, force: boolean) {
  let cals = check(
    await db.from('calendars').select('id, caldav_url, name, user_id').eq('user_id', userId),
  ) as CalendarRow[]
  if (cals.length === 0) {
    await upsertCalendars(db, userId, await discoverCalendars())
    cals = check(
      await db.from('calendars').select('id, caldav_url, name, user_id').eq('user_id', userId),
    ) as CalendarRow[]
  }
  if (calendarId) cals = cals.filter((c) => c.id === calendarId)
  const results: SyncResult[] = []
  for (let i = 0; i < cals.length; i += 3) {
    results.push(...(await Promise.all(cals.slice(i, i + 3).map((c) => syncCalendar(db, c, force)))))
  }
  const errors = results.filter((r) => r.error).map((r) => ({ calendar_id: r.calendar_id, error: r.error }))
  return {
    ok: errors.length === 0,
    calendars: results.length,
    changed: results.reduce((a, r) => a + r.changed, 0),
    deleted: results.reduce((a, r) => a + r.deleted, 0),
    unchanged: results.filter((r) => r.skipped).length,
    errors,
  }
}

// ---------- Crear / editar / borrar ----------

function readEventInput(v: unknown): EventInput {
  const e = (v ?? {}) as Record<string, unknown>
  const title = typeof e.title === 'string' ? e.title.trim() : ''
  const starts = typeof e.starts_at === 'string' ? e.starts_at : ''
  if (!title) throw new HandledError('El evento necesita un título', 'invalid')
  if (Number.isNaN(Date.parse(starts))) throw new HandledError('Fecha de inicio no válida', 'invalid')
  const ends = typeof e.ends_at === 'string' && !Number.isNaN(Date.parse(e.ends_at)) ? e.ends_at : null
  return {
    title,
    starts_at: new Date(starts).toISOString(),
    ends_at: ends ? new Date(ends).toISOString() : null,
    all_day: e.all_day === true,
    location: typeof e.location === 'string' && e.location.trim() ? e.location.trim() : null,
    notes: typeof e.notes === 'string' && e.notes.trim() ? e.notes.trim() : null,
  }
}

async function putIcs(url: string, ics: string, cond: Record<string, string>): Promise<string | null> {
  const res = await dav('PUT', url, {
    body: ics,
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', ...cond },
  })
  await res.body?.cancel()
  if (res.status === 412)
    throw new HandledError('El evento ha cambiado en iCloud: sincroniza e inténtalo de nuevo', 'conflict')
  if (!res.ok) throw new HandledError(`iCloud rechazó el evento (${res.status})`, 'upstream')
  let etag = res.headers.get('etag')
  if (!etag) {
    const r = await dav('REPORT', url.replace(/[^/]+$/, ''), {
      depth: '1',
      body: calendarQueryBody({}),
    }).catch(() => null)
    if (r) etag = parseEtags(await r.text()).find((e) => resolveHref(url, e.href) === url)?.etag ?? null
  }
  return etag
}

async function createEvent(db: Db, userId: string, body: Record<string, unknown>) {
  const input = readEventInput(body.event)
  const cal = check(
    await db.from('calendars').select('id, caldav_url').eq('id', String(body.calendar_id)).eq('user_id', userId).maybeSingle(),
  ) as { id: string; caldav_url: string } | null
  if (!cal) throw new HandledError('Calendario no encontrado', 'invalid')
  const uid = crypto.randomUUID().toUpperCase()
  const href = new URL(`${uid}.ics`, cal.caldav_url).href
  const ics = serializeEvent({ ...input, uid })
  const etag = await putIcs(href, ics, { 'If-None-Match': '*' })
  const row = check(
    await db
      .from('events')
      .upsert(
        {
          user_id: userId,
          calendar_id: cal.id,
          uid,
          href,
          etag,
          ...input,
          location: input.location ?? null,
          notes: input.notes ?? null,
          rrule: null,
          exdates: [],
          raw_ics: ics,
          deleted: false,
        },
        { onConflict: 'calendar_id,uid' },
      )
      .select('id')
      .single(),
  ) as { id: string }
  return { ok: true, event_id: row.id }
}

async function loadEvent(db: Db, userId: string, id: unknown) {
  const ev = check(
    await db
      .from('events')
      .select('id, calendar_id, uid, href, etag, raw_ics, rrule, exdates')
      .eq('id', String(id))
      .eq('user_id', userId)
      .maybeSingle(),
  ) as {
    id: string
    calendar_id: string
    uid: string
    href: string | null
    etag: string | null
    raw_ics: string | null
    rrule: string | null
    exdates: string[] | null
  } | null
  if (!ev || !ev.href) throw new HandledError('Evento no encontrado', 'invalid')
  return ev as typeof ev & { href: string }
}

async function updateEvent(db: Db, userId: string, body: Record<string, unknown>) {
  const input = readEventInput(body.event)
  const ev = await loadEvent(db, userId, body.event_id)
  const ics = ev.raw_ics ? updateIcs(ev.raw_ics, input) : serializeEvent({ ...input, uid: ev.uid })
  const etag = await putIcs(ev.href, ics, ev.etag ? { 'If-Match': ev.etag } : {})
  check(
    await db
      .from('events')
      .update({ ...input, location: input.location ?? null, notes: input.notes ?? null, etag, raw_ics: ics })
      .eq('id', ev.id),
  )
  return { ok: true, event_id: ev.id }
}

async function deleteEvent(db: Db, userId: string, body: Record<string, unknown>) {
  const ev = await loadEvent(db, userId, body.event_id)
  const res = await dav('DELETE', ev.href, { headers: ev.etag ? { 'If-Match': ev.etag } : {} })
  await res.body?.cancel()
  if (res.status === 412)
    throw new HandledError('El evento ha cambiado en iCloud: sincroniza e inténtalo de nuevo', 'conflict')
  if (!res.ok && res.status !== 404) throw new HandledError(`iCloud no pudo borrar el evento (${res.status})`, 'upstream')
  check(await db.from('events').delete().eq('id', ev.id))
  return { ok: true }
}

// ---------- Entrada ----------

function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a)
  const eb = new TextEncoder().encode(b)
  if (ea.length !== eb.length) return false
  let diff = 0
  for (let i = 0; i < ea.length; i++) diff |= ea[i]! ^ eb[i]!
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido' }, 405)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return json({ ok: false, error: 'JSON no válido' }, 400)
    }
    const action = String(body.action ?? '')

    // Autenticación: cron (secreto propio) o usuario (JWT).
    let userId: string
    const cronSecret = Deno.env.get('CRON_SECRET')
    const sent = req.headers.get('x-cron-secret')
    if (sent) {
      if (!cronSecret || !timingSafeEqual(sent, cronSecret)) return json({ ok: false, error: 'No autorizado' }, 401)
      if (action !== 'sync') return json({ ok: false, error: 'El cron solo puede sincronizar' }, 403)
      // Una sola persona usa la app: se sincroniza para el usuario más antiguo.
      const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 50 })
      if (error || !data.users.length) return json({ ok: false, error: 'No hay usuarios' }, 500)
      userId = [...data.users].sort((a, b) => a.created_at.localeCompare(b.created_at))[0]!.id
    } else {
      const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
      const { data, error } = jwt ? await db.auth.getUser(jwt) : { data: null, error: new Error('sin token') }
      if (error || !data?.user) return json({ ok: false, error: 'No autorizado' }, 401)
      userId = data.user.id
    }

    switch (action) {
      case 'test': {
        const principal = parsePrincipalHref(await davXml('PROPFIND', ICLOUD, { depth: '0', body: principalBody }))
        return json({ ok: Boolean(principal) })
      }
      case 'discover': {
        const found = await discoverCalendars()
        const { total, added } = await upsertCalendars(db, userId, found)
        return json({ ok: true, calendars: total, added })
      }
      case 'sync':
        return json(
          await syncAll(db, userId, typeof body.calendar_id === 'string' ? body.calendar_id : undefined, body.force === true),
        )
      case 'create':
        return json(await createEvent(db, userId, body))
      case 'update':
        return json(await updateEvent(db, userId, body))
      case 'delete':
        return json(await deleteEvent(db, userId, body))
      default:
        return json({ ok: false, error: 'Acción desconocida' }, 400)
    }
  } catch (e) {
    if (e instanceof HandledError) return json({ ok: false, error: e.message, code: e.code }, e.status)
    console.error('caldav error:', e instanceof Error ? e.message : String(e))
    return json({ ok: false, error: e instanceof Error ? e.message : 'Error interno', code: 'internal' }, 500)
  }
})
