import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import type { Tables, TablesInsert } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'
import { dayBoundsMs } from './logic/grid'
import type { EventPayload } from './logic/eventForm'

export type Calendar = Tables<'calendars'>
export type EventRow = Tables<'events'>
export type Subject = Tables<'subjects'>
export type Deadline = Tables<'deadlines'>
export type Milestone = Tables<'tfg_milestones'>

export const agendaKeys = {
  calendars: ['calendars'] as const,
  events: (from: string, to: string) => ['events', from, to] as const,
  sync: ['sync_state'] as const,
  subjects: ['subjects'] as const,
  deadlines: ['deadlines'] as const,
  tfg: ['tfg_milestones'] as const,
}

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

// ---------- iCloud (Edge Function caldav) ----------

export type CaldavResult = {
  ok: boolean
  error?: string
  calendars?: number
  added?: number
  changed?: number
  deleted?: number
  unchanged?: number
  errors?: { calendar_id: string; error: string }[]
  event_id?: string
}

/** Llama a la función `caldav`. Lanza Error con el mensaje en castellano si algo falla. */
export async function callCaldav(action: string, body: Record<string, unknown> = {}): Promise<CaldavResult> {
  const { data, error } = await supabase.functions.invoke<CaldavResult>('caldav', { body: { action, ...body } })
  if (error) {
    let msg = 'No se ha podido contactar con la función de iCloud'
    const ctx = (error as { context?: unknown }).context
    if (ctx instanceof Response) {
      try {
        const j = (await ctx.json()) as { error?: string }
        if (j.error) msg = j.error
      } catch {
        /* sin cuerpo JSON */
      }
    }
    throw new Error(msg)
  }
  if (!data?.ok && data?.error) throw new Error(data.error)
  if (data && data.errors?.length) throw new Error(data.errors[0]!.error)
  return data ?? { ok: false }
}

function useInvalidateAgenda() {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['events'] }),
      qc.invalidateQueries({ queryKey: agendaKeys.calendars }),
      qc.invalidateQueries({ queryKey: agendaKeys.sync }),
    ])
}

export function useCaldavSync() {
  const invalidate = useInvalidateAgenda()
  return useMutation({
    mutationFn: (opts: { force?: boolean } = {}) => callCaldav('sync', { force: opts.force === true }),
    onSettled: invalidate,
  })
}

export function useCaldavAction(action: 'test' | 'discover') {
  const invalidate = useInvalidateAgenda()
  return useMutation({ mutationFn: () => callCaldav(action), onSettled: invalidate })
}

export function useEventMutations() {
  const invalidate = useInvalidateAgenda()
  const opts = { onSettled: invalidate }
  return {
    create: useMutation({
      mutationFn: (v: { calendar_id: string; event: EventPayload }) => callCaldav('create', v),
      ...opts,
    }),
    update: useMutation({
      mutationFn: (v: { event_id: string; event: EventPayload }) => callCaldav('update', v),
      ...opts,
    }),
    remove: useMutation({ mutationFn: (event_id: string) => callCaldav('delete', { event_id }), ...opts }),
  }
}

// ---------- Calendarios y eventos ----------

export function useCalendars() {
  return useQuery({
    queryKey: agendaKeys.calendars,
    queryFn: async () => {
      const { data, error } = await supabase.from('calendars').select('*').order('name')
      fail(error)
      return data ?? []
    },
  })
}

export function useUpdateCalendar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string; color?: string; visible?: boolean; is_default?: boolean }) => {
      const { id, ...patch } = v
      if (patch.is_default) {
        const r = await supabase.from('calendars').update({ is_default: false }).neq('id', id)
        fail(r.error)
      }
      const { error } = await supabase.from('calendars').update(patch).eq('id', id)
      fail(error)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: agendaKeys.calendars }),
  })
}

/** Estado de sincronización: la última vez que todos los calendarios se sincronizaron bien. */
export function useSyncStatus() {
  return useQuery({
    queryKey: agendaKeys.sync,
    queryFn: async () => {
      const { data, error } = await supabase.from('sync_state').select('calendar_id, last_synced_at, last_error')
      fail(error)
      const rows = data ?? []
      const times = rows.map((r) => (r.last_synced_at ? Date.parse(r.last_synced_at) : null))
      return {
        lastSyncedAt: times.length && times.every((t) => t !== null) ? Math.min(...(times as number[])) : null,
        lastError: rows.find((r) => r.last_error)?.last_error ?? null,
        known: rows.length > 0,
      }
    },
  })
}

/** Eventos (sin borrados) que pueden tocar el rango de días [from, to]: incluye recurrentes. */
export function useEvents(from: string, to: string) {
  return useQuery({
    queryKey: agendaKeys.events(from, to),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const fromIso = new Date(dayBoundsMs(from)[0] - 86_400_000).toISOString()
      const toIso = new Date(dayBoundsMs(to)[1]).toISOString()
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('deleted', false)
        .lt('starts_at', toIso)
        .or(`rrule.not.is.null,ends_at.gte.${fromIso},starts_at.gte.${fromIso}`)
        .order('starts_at')
        .limit(2000)
      fail(error)
      return data ?? []
    },
  })
}

// ---------- Uni ----------

export function useSubjects() {
  return useQuery({
    queryKey: agendaKeys.subjects,
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*').order('course').order('name')
      fail(error)
      return data ?? []
    },
  })
}

export function useDeadlines() {
  return useQuery({
    queryKey: agendaKeys.deadlines,
    queryFn: async () => {
      const { data, error } = await supabase.from('deadlines').select('*').order('due_at')
      fail(error)
      return data ?? []
    },
  })
}

export function useMilestones() {
  return useQuery({
    queryKey: agendaKeys.tfg,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tfg_milestones')
        .select('*')
        .order('position')
        .order('created_at')
      fail(error)
      return data ?? []
    },
  })
}

export function useSaveSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (s: TablesInsert<'subjects'>) => {
      const { error } = s.id
        ? await supabase.from('subjects').update(s).eq('id', s.id)
        : await supabase.from('subjects').insert(s)
      fail(error)
    },
    onSettled: () => Promise.all([qc.invalidateQueries({ queryKey: agendaKeys.subjects }), qc.invalidateQueries({ queryKey: agendaKeys.deadlines })]),
  })
}

export function useDeleteSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => fail((await supabase.from('subjects').delete().eq('id', id)).error),
    onSettled: () => Promise.all([qc.invalidateQueries({ queryKey: agendaKeys.subjects }), qc.invalidateQueries({ queryKey: agendaKeys.deadlines })]),
  })
}

export function useSaveDeadline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: TablesInsert<'deadlines'>) => {
      const { error } = d.id
        ? await supabase.from('deadlines').update(d).eq('id', d.id)
        : await supabase.from('deadlines').insert(d)
      fail(error)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: agendaKeys.deadlines }),
  })
}

export function useDeleteDeadline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => fail((await supabase.from('deadlines').delete().eq('id', id)).error),
    onSettled: () => qc.invalidateQueries({ queryKey: agendaKeys.deadlines }),
  })
}

export function useSaveMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (m: TablesInsert<'tfg_milestones'>) => {
      const { error } = m.id
        ? await supabase.from('tfg_milestones').update(m).eq('id', m.id)
        : await supabase.from('tfg_milestones').insert(m)
      fail(error)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: agendaKeys.tfg }),
  })
}

export function useDeleteMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => fail((await supabase.from('tfg_milestones').delete().eq('id', id)).error),
    onSettled: () => qc.invalidateQueries({ queryKey: agendaKeys.tfg }),
  })
}
