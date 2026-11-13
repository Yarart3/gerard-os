import { defaultTitle, elapsedMinutes, formatElapsed, sessionStats } from './session'

describe('entreno en curso', () => {
  it('título según la hora de Madrid', () => {
    expect(defaultTitle(new Date('2026-11-13T08:00:00Z'))).toBe('Entreno de mañana') // 09:00
    expect(defaultTitle(new Date('2026-11-13T17:00:00Z'))).toBe('Entreno de tarde') // 18:00
    expect(defaultTitle(new Date('2026-11-13T21:30:00Z'))).toBe('Entreno de noche') // 22:30
  })
  it('cronómetro y minutos', () => {
    const start = '2026-11-13T10:00:00Z'
    const t = (s: number) => new Date(start).getTime() + s * 1000
    expect(formatElapsed(start, t(65))).toBe('1:05')
    expect(formatElapsed(start, t(3725))).toBe('1:02:05')
    expect(elapsedMinutes(start, t(20))).toBe(1)
    expect(elapsedMinutes(start, t(47 * 60 + 40))).toBe(48)
    expect(elapsedMinutes(null)).toBeNull()
  })
  it('resumen: series hechas y volumen solo de las hechas', () => {
    const set = (done: boolean, weight_kg: number | null, reps: number | null) => ({ done, weight_kg, reps })
    expect(sessionStats([{ sets: [set(true, 60, 8), set(false, 60, 8)] }, { sets: [set(true, null, 10)] }])).toEqual({
      done: 2,
      total: 3,
      volume: 480,
    })
  })
})
