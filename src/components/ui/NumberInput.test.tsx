import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NumberInput } from './NumberInput'

describe('NumberInput', () => {
  it('muestra coma decimal y guarda al salir', async () => {
    const onCommit = vi.fn()
    render(<NumberInput aria-label="Peso" value={102.5} onCommit={onCommit} />)
    const input = screen.getByRole('textbox', { name: 'Peso' })
    expect(input).toHaveValue('102,5')
    await userEvent.clear(input)
    await userEvent.type(input, '105,25{Enter}')
    expect(onCommit).toHaveBeenCalledWith(105.25)
  })
  it('no guarda si no cambia', async () => {
    const onCommit = vi.fn()
    render(<NumberInput aria-label="Repes" value={8} onCommit={onCommit} decimals={0} />)
    await userEvent.click(screen.getByRole('textbox'))
    await userEvent.tab()
    expect(onCommit).not.toHaveBeenCalled()
  })
})
