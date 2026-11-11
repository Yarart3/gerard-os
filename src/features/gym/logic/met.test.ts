import { DEFAULT_MET, exerciseMet, metKcal, sessionMet } from './met'

describe('MET', () => {
  it('aplica kcal = MET × 3,5 × peso / 200 × minutos', () => {
    // 5 × 3,5 × 80 / 200 × 60 = 420
    expect(metKcal(5, 80, 60)).toBeCloseTo(420)
    expect(metKcal(8, 70, 20)).toBeCloseTo(196)
  })
  it('devuelve 0 con datos vacíos o negativos', () => {
    expect(metKcal(5, 0, 60)).toBe(0)
    expect(metKcal(5, 80, -1)).toBe(0)
  })
  it('usa el MET propio o el del tipo', () => {
    expect(exerciseMet({ met: 9.5, type: 'strength' }, DEFAULT_MET)).toBe(9.5)
    expect(exerciseMet({ met: null, type: 'metcon' }, DEFAULT_MET)).toBe(8)
    expect(exerciseMet({ met: null, type: 'raro' }, DEFAULT_MET)).toBe(5)
  })
  it('MET de sesión = media, o el de respaldo', () => {
    expect(sessionMet([5, 8], 5)).toBe(6.5)
    expect(sessionMet([], 5)).toBe(5)
  })
})
