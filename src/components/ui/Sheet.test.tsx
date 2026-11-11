import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sheet } from './Sheet'

describe('Sheet', () => {
  it('no renderiza nada cerrado', () => {
    render(
      <Sheet open={false} onClose={() => {}} title="Ajustes">
        contenido
      </Sheet>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('es un diálogo con título y se cierra con Escape y con la X', async () => {
    const onClose = vi.fn()
    render(
      <Sheet open onClose={onClose} title="Ajustes de Gym">
        contenido
      </Sheet>,
    )
    expect(screen.getByRole('dialog', { name: 'Ajustes de Gym' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
