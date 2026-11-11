import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { SectionScreen } from './SectionScreen'
import { SECTIONS } from './sections'

vi.mock('../lib/supabase', async () => ({ supabase: (await import('../test/fakeSupabase')).fakeSupabase }))

const gym = SECTIONS.find((s) => s.id === 'gym')!
const personal = SECTIONS.find((s) => s.id === 'personal')!

function Where() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="gym/:sub?" element={<SectionScreen section={gym} />} />
          <Route path="personal/:sub?" element={<SectionScreen section={personal} />} />
        </Routes>
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SectionScreen', () => {
  it('muestra el primer apartado por defecto y navega al cambiar', async () => {
    renderAt('/gym')
    expect(screen.getByRole('heading', { level: 1, name: 'Gym' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Entreno' })).toHaveAttribute('aria-checked', 'true')
    expect(await screen.findByText('Sin entreno hoy')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Nutrición' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/gym/nutricion')
    expect(await screen.findByRole('group', { name: 'Apartados de Nutrición' })).toBeInTheDocument()
  })

  it('la rueda abre el Sheet con los ajustes de Gym y Ajustes generales', async () => {
    renderAt('/gym/historial')
    await userEvent.click(screen.getByRole('button', { name: 'Ajustes de Gym' }))
    expect(screen.getByRole('dialog', { name: 'Ajustes de Gym' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Guardar ajustes de Gym' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajustes generales' })).toBeInTheDocument()
  })

  it('una sección sin construir muestra el estado vacío', () => {
    renderAt('/personal/notas')
    expect(screen.getByText('Notas: aún vacío')).toBeInTheDocument()
  })

  it('un apartado desconocido vuelve al de por defecto', () => {
    renderAt('/gym/nope')
    expect(screen.getByTestId('path')).toHaveTextContent(/^\/gym$/)
  })
})
