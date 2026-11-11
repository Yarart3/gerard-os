import { render, screen } from '@testing-library/react'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('recorta el valor a 0–100 y lo expone accesible', () => {
    render(<ProgressBar value={1.4} label="Kcal" />)
    expect(screen.getByRole('progressbar', { name: 'Kcal' })).toHaveAttribute('aria-valuenow', '100')
  })
})
