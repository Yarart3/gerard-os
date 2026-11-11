import { formatDateLabel, formatEuros, formatKcal, formatKg, formatNumber, parseDecimal } from './format'

const nbsp = new RegExp(String.fromCharCode(160), 'g')

describe('format', () => {
  it('agrupa miles con punto incluso con 4 cifras', () => {
    expect(formatKcal(1840)).toBe('1.840 kcal')
    expect(formatNumber(12345.67, 2)).toBe('12.345,67')
  })
  it('usa coma decimal', () => {
    expect(formatKg(102.5)).toBe('102,5 kg')
  })
  it('formatea euros con dos decimales', () => {
    expect(formatEuros(24.3).replace(nbsp, ' ')).toBe('24,30 €')
  })
  it('etiqueta de fecha en mayúsculas y zona de Madrid', () => {
    // 23:30 UTC del 10/11 = 00:30 del 11/11 en Madrid
    expect(formatDateLabel(new Date('2026-11-10T23:30:00Z'))).toBe('MIÉRCOLES, 11 DE NOVIEMBRE')
  })
})

describe('parseDecimal', () => {
  it('acepta coma y punto', () => {
    expect(parseDecimal('102,5')).toBe(102.5)
    expect(parseDecimal(' 80.25 ')).toBe(80.25)
  })
  it('devuelve null si no es número', () => {
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
  })
})

describe('duración', () => {
  it('formatea y parsea m:ss', async () => {
    const { formatDuration, parseDuration } = await import('./format')
    expect(formatDuration(90)).toBe('1:30')
    expect(formatDuration(3723)).toBe('1:02:03')
    expect(parseDuration('1:30')).toBe(90)
    expect(parseDuration('45')).toBe(45)
    expect(parseDuration('1:x')).toBeNull()
  })
})
