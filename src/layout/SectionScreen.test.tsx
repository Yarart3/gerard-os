import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { SectionScreen } from './SectionScreen'
import { SECTIONS } from './sections'

const gym = SECTIONS.find((s) => s.id === 'gym')!

function Where() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="gym/:sub?" element={<SectionScreen section={gym} />} />
      </Routes>
      <Where />
    </MemoryRouter>,
  )
}

describe('SectionScreen', () => {
  it('muestra el primer apartado por defecto y navega al cambiar', async () => {
    renderAt('/gym')
    expect(screen.getByRole('heading', { level: 1, name: 'Gym' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Entreno' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(screen.getByRole('radio', { name: 'Nutrición' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/gym/nutricion')
    expect(screen.getByText('Nutrición: aún vacío')).toBeInTheDocument()
  })

  it('la rueda abre el Sheet de ajustes de la sección', async () => {
    renderAt('/gym/historial')
    await userEvent.click(screen.getByRole('button', { name: 'Ajustes de Gym' }))
    expect(screen.getByRole('dialog', { name: 'Ajustes de Gym' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajustes generales' })).toBeInTheDocument()
  })

  it('un apartado desconocido vuelve al de por defecto', () => {
    renderAt('/gym/nope')
    expect(screen.getByTestId('path')).toHaveTextContent(/^\/gym$/)
  })
})
