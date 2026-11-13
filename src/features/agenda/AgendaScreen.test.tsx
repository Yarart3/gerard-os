import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '../../components/ui'
import SettingsPage from '../settings/SettingsPage'
import { SectionScreen } from '../../layout/SectionScreen'
import { SECTIONS } from '../../layout/sections'

vi.mock('../../lib/supabase', async () => ({ supabase: (await import('../../test/fakeSupabase')).fakeSupabase }))

const agenda = SECTIONS.find((s) => s.id === 'agenda')!

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="agenda/:sub?" element={<SectionScreen section={agenda} />} />
            <Route path="ajustes" element={<SettingsPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('Agenda', () => {
  it('Calendario sin calendarios guía a los ajustes y permite cambiar de vista', async () => {
    renderAt('/agenda')
    expect(await screen.findByText('Aún no hay calendarios')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Mes' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(screen.getByRole('radio', { name: 'Semana' }))
    expect(screen.getByRole('radio', { name: 'Semana' })).toHaveAttribute('aria-checked', 'true')
  })

  it('Uni vacía muestra media sin nota y estados vacíos', async () => {
    renderAt('/agenda/uni')
    expect(await screen.findByText('Sin asignaturas')).toBeInTheDocument()
    expect(screen.getByText('Nada pendiente')).toBeInTheDocument()
    expect(screen.getByText('Sin hitos')).toBeInTheDocument()
  })

  it('«Ajustar» lleva a su apartado en Ajustes con Probar conexión', async () => {
    renderAt('/agenda')
    await userEvent.click(screen.getByRole('link', { name: 'Ajustar Agenda' }))
    expect(await screen.findByRole('button', { name: 'Probar conexión' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Descubrir calendarios' })).toBeInTheDocument()
  })
})
