import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WodSheet } from './WodSheet'

const mutateAsync = vi.fn(async () => ({}))
const catalog = [
  { id: '1', name: 'Thruster', aliases: [], archived: false },
  { id: '2', name: 'Pull-up', aliases: ['Dominadas'], archived: false },
]
vi.mock('../api', () => ({
  useExercises: () => ({ data: catalog }),
  useSaveExercise: () => ({ mutateAsync, isPending: false }),
}))

describe('WodSheet', () => {
  it('detecta ejercicios, crea los nuevos y añade los elegidos', async () => {
    const onAdd = vi.fn(async () => {})
    render(<WodSheet open onClose={() => {}} onAdd={onAdd} />)
    await userEvent.type(
      screen.getByRole('textbox'),
      '21-15-9{Enter}Thrusters{Enter}dominadas{Enter}Wall balls',
    )
    expect(screen.getByRole('checkbox', { name: 'Incluir Thruster' })).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Crear Wall Balls en el catálogo' }))
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ name: 'Wall Balls', type: 'metcon' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Incluir Pull-up' }))
    await userEvent.click(screen.getByRole('button', { name: 'Añadir 1 al entreno' }))
    expect(onAdd).toHaveBeenCalledWith([catalog[0]], expect.stringContaining('Thrusters'))
  })
})
