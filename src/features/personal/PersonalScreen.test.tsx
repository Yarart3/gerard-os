import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '../../components/ui'
import SettingsPage from '../settings/SettingsPage'
import { SectionScreen } from '../../layout/SectionScreen'
import { SECTIONS } from '../../layout/sections'
import { countPending } from './logic/watchlist'

vi.mock('../../lib/supabase', async () => ({ supabase: (await import('../../test/fakeSupabase')).fakeSupabase }))

const personal = SECTIONS.find((s) => s.id === 'personal')!

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="personal/:sub?" element={<SectionScreen section={personal} />} />
            <Route path="ajustes" element={<SettingsPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('Personal', () => {
  it('Gastos vacío muestra el total a cero y permite añadir un gasto', async () => {
    renderAt('/personal')
    expect(await screen.findByText('Total del mes')).toBeInTheDocument()
    expect(await screen.findByText('Sin gastos este mes.')).toBeInTheDocument()
    expect(screen.getByText(/0,00\s€/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Añadir/ }))
    expect(await screen.findByRole('dialog', { name: 'Nuevo gasto' })).toBeInTheDocument()
  })

  it('Watchlist y Notas vacías muestran su estado vacío', async () => {
    renderAt('/personal/watchlist')
    expect(await screen.findByText('Nada en la lista')).toBeInTheDocument()
    expect(countPending([{ status: 'pending' }, { status: 'done' }, { status: 'pending' }])).toBe(2)
  })

  it('Notas vacía', async () => {
    renderAt('/personal/notas')
    expect(await screen.findByText('Sin notas')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Buscar en las notas' })).toBeInTheDocument()
  })

  it('«Ajustar» lleva a su apartado en Ajustes con las categorías', async () => {
    renderAt('/personal')
    await userEvent.click(screen.getByRole('link', { name: 'Ajustar Personal' }))
    expect(await screen.findByText('Categorías de gasto')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Añadir categoría/ })).toBeInTheDocument()
  })
})
