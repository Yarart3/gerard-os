import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { persistQueryClientRestore, persistQueryClientSave } from '@tanstack/react-query-persist-client'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components/ui'
import { useAddItems, useAddSet, useUpdateSet, type Workout } from '../../features/gym/api'
import { useAddMealItem } from '../../features/nutrition/api'
import { useDeleteNote, useSaveNote, type Note } from '../../features/personal/api'
import { GeneralSettingsPage } from '../../features/settings/GeneralSettingsPage'
import { SyncStatus } from '../../layout/SyncStatus'
import { fakeOfflineSupabase, server } from '../../test/offlineSupabase'
import { createQueryClient } from '../queryClient'
import { stopProbe } from './connectivity'
import { persistOptions as realOptions, createPersister, type KvStorage } from './persister'
import { countUnsynced, unsyncedWarning } from './pending'
import { registerOfflineMutations } from './register'
import { resumeOfflineQueue } from './restore'

vi.mock('../supabase', async () => ({
  supabase: (await import('../../test/offlineSupabase')).fakeOfflineSupabase,
}))

function makeClient() {
  const qc = createQueryClient()
  registerOfflineMutations(qc)
  return qc
}
const wrap = (qc: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <ToastProvider>
          <MemoryRouter>{children}</MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    )
  }
const memoryStorage = (): KvStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  }
}
const tick = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  server.reset()
  onlineManager.setOnline(true)
})
afterEach(() => {
  stopProbe()
  onlineManager.setOnline(true)
})

describe('cola offline', () => {
  it('persiste las mutaciones pausadas y las reanuda en orden de creación al restaurar', async () => {
    const qc = makeClient()
    onlineManager.setOnline(false)
    const { result } = renderHook(() => ({ save: useSaveNote(), del: useDeleteNote() }), {
      wrapper: wrap(qc),
    })
    act(() => {
      result.current.save.mutate({ title: 'A', body: 'a', tags: [], pinned: false })
      result.current.save.mutate({ title: 'B', body: 'b', tags: [], pinned: false })
    })
    await waitFor(() => expect(countUnsynced(qc)).toBe(2))
    const first = qc.getMutationCache().getAll()[0]!
    const idA = (first.state.variables as { id: string }).id
    act(() => result.current.del.mutate(idA))
    await waitFor(() => expect(countUnsynced(qc)).toBe(3))
    expect(server.calls).toHaveLength(0) // sin red no se envía nada

    // Se guarda y se "reabre la app": cliente nuevo, caché restaurada del almacén.
    const storage = memoryStorage()
    const persister = createPersister(storage)
    const opts = { ...realOptions, persister }
    await persistQueryClientSave({ queryClient: qc, ...opts })
    await vi.waitFor(() => expect(storage.data.size).toBe(1))
    qc.clear()

    const qc2 = makeClient()
    await persistQueryClientRestore({ queryClient: qc2, ...opts })
    expect(countUnsynced(qc2)).toBe(3)

    onlineManager.setOnline(true)
    resumeOfflineQueue(qc2)
    await vi.waitFor(() => expect(server.calls).toHaveLength(3))
    expect(server.calls.map((c) => `${c.table}:${c.op}`)).toEqual([
      'notes:upsert',
      'notes:upsert',
      'notes:delete',
    ])
    expect((server.calls[0]!.payload as { id: string }[])[0]!.id).toBe(idA)
    expect(server.calls[2]!.filters).toEqual([['id', idA]])
    await vi.waitFor(() => expect(countUnsynced(qc2)).toBe(0))
    expect(server.table('notes').size).toBe(1) // A creada y borrada, B queda
  })

  it('no persiste las mutaciones normales ni las ya terminadas', async () => {
    const qc = makeClient()
    const { result } = renderHook(() => useSaveNote(), { wrapper: wrap(qc) })
    await act(() => result.current.mutateAsync({ title: 'x', body: 'x', tags: [], pinned: false }))
    await waitFor(() => expect(qc.getMutationCache().getAll()).toHaveLength(0)) // retirada tras enviarse
  })

  it('reintentar no duplica: mismo ID y upsert que ignora duplicados', async () => {
    const qc = makeClient()
    server.failNext = [{ message: 'TypeError: Failed to fetch' }] // el 1.º intento falla por red
    const { result } = renderHook(() => useSaveNote(), { wrapper: wrap(qc) })
    act(() => result.current.mutate({ title: 'N', body: 'n', tags: [], pinned: false }))
    await vi.waitFor(() => expect(onlineManager.isOnline()).toBe(false)) // la red fallida se detecta
    onlineManager.setOnline(true)
    await vi.waitFor(() => expect(server.calls).toHaveLength(2), { timeout: 4000 })
    const ids = server.calls.map((c) => (c.payload as { id: string }[])[0]!.id)
    expect(ids[0]!).toBe(ids[1]!)
    expect(server.calls.every((c) => c.opts?.onConflict === 'id' && c.opts.ignoreDuplicates)).toBe(true)
    expect(server.table('notes').size).toBe(1)
  })

  it('una escritura con el token caducado refresca la sesión y se reintenta', async () => {
    const qc = makeClient()
    server.failNext = [{ message: 'JWT expired', code: 'PGRST301' }]
    const { result } = renderHook(() => useSaveNote(), { wrapper: wrap(qc) })
    act(() => result.current.mutate({ title: 'N', body: 'n', tags: [], pinned: false }))
    await vi.waitFor(() => expect(server.table('notes').size).toBe(1), { timeout: 4000 })
    expect(server.refreshCalls).toBe(1)
    expect(server.sessionCalls).toBeGreaterThanOrEqual(2) // getSession antes de cada intento
  })

  it('un error permanente no se descarta solo: queda como fallido y se puede descartar', async () => {
    const qc = makeClient()
    server.failNext = [{ message: 'new row violates row-level security policy', code: '42501' }]
    const { result } = renderHook(() => useSaveNote(), { wrapper: wrap(qc) })
    act(() => result.current.mutate({ title: 'N', body: 'n', tags: [], pinned: false }))
    render(<SyncStatus />, { wrapper: wrap(qc) })
    expect(
      await screen.findByText('Un cambio no se ha podido guardar', { selector: 'span' }),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(countUnsynced(qc)).toBe(0)
  })
})

describe('actualizaciones optimistas sin red', () => {
  it('notas: lo apuntado aparece al instante en la lista', async () => {
    const qc = makeClient()
    qc.setQueryData<Note[]>(['notes'], [])
    onlineManager.setOnline(false)
    const { result } = renderHook(() => useSaveNote(), { wrapper: wrap(qc) })
    await act(() => result.current.mutateAsync({ title: '', body: 'hola', tags: [], pinned: false })) // no se cuelga
    expect(qc.getQueryData<Note[]>(['notes'])?.map((n) => n.body)).toEqual(['hola'])
    expect(result.current.isPending).toBe(false) // en cola no bloquea el botón
  })

  it('gym: crear sesión, añadir ejercicio, serie y marcarla hecha, todo sin red y con IDs del cliente', async () => {
    const qc = makeClient()
    onlineManager.setOnline(false)
    const date = '2026-11-12'
    const { result } = renderHook(
      () => ({ add: useAddItems(date, null), set: useAddSet(), upd: useUpdateSet() }),
      { wrapper: wrap(qc) },
    )
    await act(() =>
      result.current.add.mutateAsync({
        items: [
          {
            exercise_id: 'ex1',
            sets: [{ weight_kg: 50, reps: 5, seconds: null, meters: null, calories: null }],
          },
        ],
      }),
    )
    const w = qc.getQueryData<Workout>(['workout', 'active'])!
    expect(w.workout_items).toHaveLength(1)
    expect(w.workout_items[0]!.sets).toHaveLength(1)
    const item = w.workout_items[0]!

    await act(() => result.current.set.mutateAsync({ item_id: item.id, position: 1, weight_kg: 55, reps: 5 }))
    const setId = item.sets[0]!.id
    await act(() => result.current.upd.mutateAsync({ id: setId, patch: { done: true } }))
    const after = qc.getQueryData<Workout>(['workout', 'active'])!.workout_items[0]!.sets
    expect(after.map((s) => s.done)).toEqual([true, false])
    expect(after).toHaveLength(2)

    // Al volver la red se envía en orden: sesión → ejercicios → series → nueva serie → marcar hecha.
    onlineManager.setOnline(true)
    resumeOfflineQueue(qc)
    await vi.waitFor(() => expect(countUnsynced(qc)).toBe(0))
    expect(server.calls.map((c) => `${c.table}:${c.op}`)).toEqual([
      'workouts:upsert',
      'workout_items:upsert',
      'sets:upsert',
      'sets:upsert',
      'sets:update',
    ])
    expect(server.table('workouts').has(w.id)).toBe(true) // el ID de la sesión lo puso el cliente
  })

  it('nutrición: reutiliza la comida del día de la caché y crea el elemento con ID propio', async () => {
    const qc = makeClient()
    qc.setQueryData(
      ['meals', '2026-11-12', '2026-11-12'],
      [{ id: 'meal-1', date: '2026-11-12', slot: 'Comida', meal_items: [] }],
    )
    onlineManager.setOnline(false)
    server.onSelect = () => ({ id: 'meal-1', meal_items: [{ position: 0 }] })
    const { result } = renderHook(() => useAddMealItem(), { wrapper: wrap(qc) })
    await act(() =>
      result.current.mutateAsync({ date: '2026-11-12', slot: 'Comida', food_id: 'f1', grams: 150 }),
    )
    const meals = qc.getQueryData<{ id: string; meal_items: { grams: number }[] }[]>([
      'meals',
      '2026-11-12',
      '2026-11-12',
    ])!
    expect(meals[0]!.id).toBe('meal-1')
    expect(meals[0]!.meal_items.map((i) => i.grams)).toEqual([150])

    onlineManager.setOnline(true)
    resumeOfflineQueue(qc)
    await vi.waitFor(() => expect(countUnsynced(qc)).toBe(0))
    expect(server.calls.map((c) => `${c.table}:${c.op}`)).toEqual([
      'meals:upsert',
      'meals:select',
      'meal_items:upsert',
    ])
    const item = (server.calls[2]!.payload as { meal_id: string; position: number }[])[0]!
    expect(item).toMatchObject({ meal_id: 'meal-1', position: 1 })
  })
})

describe('aviso de cambios pendientes', () => {
  it('el mensaje de cierre de sesión cuenta los cambios', () => {
    expect(unsyncedWarning(1)).toContain('1 cambio sin sincronizar')
    expect(unsyncedWarning(3)).toContain('3 cambios sin sincronizar')
    expect(unsyncedWarning(3)).toContain('se perderán')
  })

  it('cerrar sesión con cambios sin enviar pide confirmación; si se cancela no se cierra', async () => {
    const qc = makeClient()
    onlineManager.setOnline(false)
    const { result } = renderHook(() => useSaveNote(), { wrapper: wrap(qc) })
    act(() => {
      result.current.mutate({ title: '', body: 'a', tags: [], pinned: false })
      result.current.mutate({ title: '', body: 'b', tags: [], pinned: false })
    })
    await waitFor(() => expect(countUnsynced(qc)).toBe(2))

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<GeneralSettingsPage />, { wrapper: wrap(qc) })
    await userEvent.click(screen.getByText('Cerrar sesión'))
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('2 cambios sin sincronizar'))
    expect(fakeOfflineSupabase.auth.signOut).not.toHaveBeenCalled()
    confirmSpy.mockReturnValue(true)
    await userEvent.click(screen.getByText('Cerrar sesión'))
    expect(fakeOfflineSupabase.auth.signOut).toHaveBeenCalledTimes(1)
    confirmSpy.mockRestore()
  })

  it('sin cambios pendientes no pregunta', async () => {
    const qc = makeClient()
    const confirmSpy = vi.spyOn(window, 'confirm')
    render(<GeneralSettingsPage />, { wrapper: wrap(qc) })
    await userEvent.click(screen.getByText('Cerrar sesión'))
    expect(confirmSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})

describe('indicador SyncStatus', () => {
  it('sin conexión muestra los cambios pendientes y, al volver, sincroniza y avisa', async () => {
    const qc = makeClient()
    onlineManager.setOnline(false)
    const hook = renderHook(() => useSaveNote(), { wrapper: wrap(qc) })
    render(<SyncStatus />, { wrapper: wrap(qc) })
    expect(screen.getByText('Sin conexión')).toBeInTheDocument()
    act(() => {
      hook.result.current.mutate({ title: '', body: 'a', tags: [], pinned: false })
      hook.result.current.mutate({ title: '', body: 'b', tags: [], pinned: false })
    })
    expect(await screen.findByText('Sin conexión · 2 cambios pendientes')).toBeInTheDocument()
    expect(
      screen.getByText('Sin conexión · 2 cambios pendientes').closest('[aria-live="polite"]'),
    ).not.toBeNull()

    onlineManager.setOnline(true)
    resumeOfflineQueue(qc)
    expect(await screen.findByText('2 cambios guardados', {}, { timeout: 3000 })).toBeInTheDocument() // toast
    await tick()
    expect(screen.queryByText(/Sin conexión/)).toBeNull()
  })

  it('con red y una escritura rápida no muestra nada', async () => {
    const qc = makeClient()
    const hook = renderHook(() => useSaveNote(), { wrapper: wrap(qc) })
    render(<SyncStatus />, { wrapper: wrap(qc) })
    await act(() => hook.result.current.mutateAsync({ title: '', body: 'a', tags: [], pinned: false }))
    expect(screen.queryByText('Sincronizando…')).toBeNull()
  })
})
