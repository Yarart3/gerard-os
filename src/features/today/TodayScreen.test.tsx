import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../components/ui'
import TodayScreen from './TodayScreen'
import TodaySettingsPanel from './TodaySettingsPanel'

let savedToday: unknown = null
const upserts: unknown[] = []

vi.mock('../../lib/supabase', async () => {
  const { fakeSupabase } = await import('../../test/fakeSupabase')
  return {
    supabase: {
      ...fakeSupabase,
      from: (table: string) => {
        if (table !== 'settings') return fakeSupabase.from()
        const q: Record<string, unknown> = {
          select: () => q,
          eq: (_c: string, v: string) => ((q.section = v), q),
          maybeSingle: async () => ({ data: q.section === 'today' && savedToday ? { data: savedToday } : null, error: null }),
          upsert: async (row: unknown) => (upserts.push(row), { error: null }),
        }
        return q
      },
    },
  }
})

function renderIt(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

const titles = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)

describe('Hoy', () => {
  beforeEach(() => {
    savedToday = null
    upserts.length = 0
  })

  it('muestra todas las tarjetas por defecto', async () => {
    renderIt(<TodayScreen />)
    expect(await screen.findByRole('heading', { name: 'Calorías' })).toBeInTheDocument()
    expect(titles()).toEqual([
      'Calorías',
      'Agenda de hoy',
      'Próximas entregas',
      'Entreno de hoy',
      'Inglés',
      'Nota rápida',
      'Personal',
    ])
    expect(screen.getByText('Continuar lección')).toBeInTheDocument()
  })

  it('respeta el orden y la visibilidad guardados', async () => {
    savedToday = {
      cards: [
        { id: 'note', visible: true },
        { id: 'kcal', visible: false },
        { id: 'english', visible: true },
      ],
    }
    renderIt(<TodayScreen />)
    expect(await screen.findByRole('heading', { name: 'Nota rápida' })).toBeInTheDocument()
    await screen.findByRole('heading', { name: 'Inglés' })
    expect(titles().slice(0, 2)).toEqual(['Nota rápida', 'Inglés'])
    expect(titles()).not.toContain('Calorías')
  })

  it('sin tarjetas activas muestra un estado vacío', async () => {
    savedToday = { cards: ['kcal', 'agenda', 'deadlines', 'workout', 'english', 'note', 'personal'].map((id) => ({ id, visible: false })) }
    renderIt(<TodayScreen />)
    expect(await screen.findByText('Sin tarjetas')).toBeInTheDocument()
  })

  it('el panel de ajustes reordena con botones accesibles y guarda', async () => {
    renderIt(<TodaySettingsPanel />)
    const down = await screen.findByRole('button', { name: 'Bajar Calorías' })
    expect(screen.getByRole('button', { name: 'Subir Calorías' })).toBeDisabled()
    await userEvent.click(down)
    const saved = upserts.at(-1) as { section: string; data: { cards: { id: string }[]; cutoff: string } }
    expect(saved.section).toBe('today')
    expect(saved.data.cards.slice(0, 2).map((c) => c.id)).toEqual(['agenda', 'kcal'])
    expect(saved.data.cutoff).toBe('04:00')
    const row = screen.getByRole('checkbox', { name: 'Agenda del día' }).closest('li')!
    expect(within(row).getByRole('button', { name: 'Subir Agenda del día' })).toBeEnabled()
  })
})
