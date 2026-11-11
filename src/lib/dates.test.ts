import { addDays, formatShortDate, isoWeekday, todayISO, weekDays, weekStart } from './dates'

describe('dates', () => {
  it('hoy en Madrid aunque en UTC sea el día anterior', () => {
    expect(todayISO(new Date('2026-11-10T23:30:00Z'))).toBe('2026-11-11')
  })
  it('semana de lunes a domingo', () => {
    expect(isoWeekday('2026-11-15')).toBe(7)
    expect(weekStart('2026-11-15')).toBe('2026-11-09')
    expect(weekStart('2026-11-09')).toBe('2026-11-09')
    expect(weekDays('2026-11-12')[6]).toBe('2026-11-15')
  })
  it('suma días cruzando de año', () => {
    expect(addDays('2026-12-28', 6)).toBe('2027-01-03')
  })
  it('formato corto en castellano', () => {
    expect(formatShortDate('2026-11-09')).toMatch(/lun.*9.*nov/)
  })
})
