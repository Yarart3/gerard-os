import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { SegmentedControl } from './SegmentedControl'

const OPTS = [
  { value: 'a', label: 'Entreno' },
  { value: 'b', label: 'Historial' },
  { value: 'c', label: 'Catálogo' },
] as const

function Harness() {
  const [v, setV] = useState<string>('a')
  return <SegmentedControl label="Gym" options={OPTS} value={v} onChange={setV} />
}

describe('SegmentedControl', () => {
  it('marca la opción activa y cambia al pulsar', async () => {
    render(<Harness />)
    expect(screen.getByRole('radio', { name: 'Entreno' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(screen.getByRole('radio', { name: 'Catálogo' }))
    expect(screen.getByRole('radio', { name: 'Catálogo' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Entreno' })).toHaveAttribute('aria-checked', 'false')
  })

  it('se navega con las flechas y da la vuelta', async () => {
    render(<Harness />)
    screen.getByRole('radio', { name: 'Entreno' }).focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByRole('radio', { name: 'Catálogo' })).toHaveFocus()
    expect(screen.getByRole('radio', { name: 'Catálogo' })).toHaveAttribute('aria-checked', 'true')
  })
})
