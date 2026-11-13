import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { SectionScreen } from './SectionScreen'
import { SECTIONS, type SectionId } from './sections'

vi.mock('../lib/supabase', async () => ({ supabase: (await import('../test/fakeSupabase')).fakeSupabase }))

const training = SECTIONS.find((s) => s.id === 'training')!
// Sección sin contenido construido: sirve para probar el estado vacío.
const today = {
  ...SECTIONS.find((s) => s.id === 'today')!,
  id: 'sin-contenido' as SectionId,
  subnav: { kind: 'chips' as const, options: [{ value: 'a', label: 'Apartado A' }] },
}

function Where() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

function renderAt(path: string | { pathname: string; state?: unknown }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="entreno/:sub?" element={<SectionScreen section={training} />} />
          <Route path="today/:sub?" element={<SectionScreen section={today} />} />
        </Routes>
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => localStorage.clear())

describe('SectionScreen', () => {
  it('muestra el primer apartado por defecto y navega al cambiar', async () => {
    renderAt('/entreno')
    expect(screen.getByRole('heading', { level: 1, name: 'Entreno' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Entreno' })).toHaveAttribute('aria-checked', 'true')
    expect(await screen.findByText('Empezar entreno vacío', {}, { timeout: 5000 })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Catálogo' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/entreno/catalogo')
  })

  it('«Ajustar» enlaza con su apartado de la página de Ajustes', () => {
    renderAt('/entreno/historial')
    expect(screen.getByRole('link', { name: 'Ajustar Entreno' })).toHaveAttribute('href', '/ajustes?s=entreno')
  })

  it('desde la barra de pestañas vuelve al último apartado usado', async () => {
    const first = renderAt('/entreno')
    await userEvent.click(screen.getByRole('radio', { name: 'Historial' }))
    first.unmount()
    renderAt({ pathname: '/entreno', state: { fromTab: true } })
    expect(screen.getByTestId('path')).toHaveTextContent('/entreno/historial')
  })

  it('una sección sin construir muestra el estado vacío', () => {
    renderAt('/today')
    expect(screen.getByText('Apartado A: aún vacío')).toBeInTheDocument()
  })

  it('un apartado desconocido vuelve al de por defecto', () => {
    renderAt('/entreno/nope')
    expect(screen.getByTestId('path')).toHaveTextContent(/^\/entreno$/)
  })
})
