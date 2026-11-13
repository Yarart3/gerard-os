import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '../../components/ui'
import SettingsPage from '../settings/SettingsPage'
import { SectionScreen } from '../../layout/SectionScreen'
import { SECTIONS } from '../../layout/sections'

vi.mock('../../lib/supabase', async () => ({ supabase: (await import('../../test/fakeSupabase')).fakeSupabase }))

const english = SECTIONS.find((s) => s.id === 'english')!

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="ingles/:sub?" element={<SectionScreen section={english} />} />
            <Route path="ajustes" element={<SettingsPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('Inglés', () => {
  it('sin perfil pide el cuestionario y deja posponerlo', async () => {
    renderAt('/ingles')
    expect(await screen.findByText('Cuéntame sobre tu inglés')).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Nivel de inglés' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ahora no' }))
    expect(await screen.findByText('Racha y puntos')).toBeInTheDocument()
  })

  it('Orden de palabras funciona con las frases semilla sin IA', async () => {
    renderAt('/ingles/orden')
    await userEvent.click(await screen.findByRole('button', { name: 'Ahora no' }))
    expect(await screen.findByText('Normalmente entreno por la mañana.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ver solución' }))
    expect(await screen.findByText('I usually train in the morning.')).toBeInTheDocument()
  })

  it('«Ajustar» lleva a su apartado en Ajustes de Inglés', async () => {
    renderAt('/ingles')
    await userEvent.click(await screen.findByRole('link', { name: 'Ajustar Inglés' }))
    expect(await screen.findByText('Objetivo diario')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Probar IA' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reiniciar progreso' })).toBeInTheDocument()
  })
})
