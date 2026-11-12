import { addDays, dayISO, formatShortDate, isoWeekday, madridDateISO, parseCutoff, todayISO, weekDays, weekStart } from './dates'

describe('dates', () => {
  it('hoy en Madrid aunque en UTC sea el día anterior', () => {
    expect(todayISO(new Date('2026-11-10T23:30:00Z'), 0)).toBe('2026-11-11')
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

describe('día con hora de corte', () => {
  const cut = 4 * 60
  it('antes del corte sigue siendo el día anterior', () => {
    // 11 nov 2026 03:59 en Madrid (CET, UTC+1) = 02:59Z
    expect(dayISO(new Date('2026-11-11T02:59:00Z'), cut)).toBe('2026-11-10')
    expect(dayISO(new Date('2026-11-10T23:30:00Z'), cut)).toBe('2026-11-10') // 00:30 Madrid del 11
  })
  it('a partir del corte ya es el día nuevo', () => {
    expect(dayISO(new Date('2026-11-11T03:00:00Z'), cut)).toBe('2026-11-11') // 04:00 Madrid
    expect(dayISO(new Date('2026-11-11T12:00:00Z'), cut)).toBe('2026-11-11')
  })
  it('corte a las 00:00 = día natural', () => {
    expect(dayISO(new Date('2026-11-10T23:30:00Z'), 0)).toBe('2026-11-11')
  })
  it('cruza mes y año hacia atrás', () => {
    expect(dayISO(new Date('2026-12-31T23:30:00Z'), cut)).toBe('2026-12-31') // 00:30 Madrid del 1 ene
    expect(dayISO(new Date('2027-01-01T02:00:00Z'), cut)).toBe('2026-12-31') // 03:00 Madrid
  })
  it('cambio a horario de verano (29 mar 2026: 02:00 -> 03:00)', () => {
    // 03:30 CEST (01:30Z) es antes de las 04:00: sigue siendo el 28
    expect(dayISO(new Date('2026-03-29T01:30:00Z'), cut)).toBe('2026-03-28')
    // 04:10 CEST (02:10Z): ya es el 29 (solo han pasado 3 h reales desde medianoche)
    expect(dayISO(new Date('2026-03-29T02:10:00Z'), cut)).toBe('2026-03-29')
  })
  it('cambio a horario de invierno (25 oct 2026: 03:00 -> 02:00)', () => {
    // 03:30 CET tras el retroceso (02:30Z): antes del corte
    expect(dayISO(new Date('2026-10-25T02:30:00Z'), cut)).toBe('2026-10-24')
    // 04:00 CET (03:00Z): día nuevo
    expect(dayISO(new Date('2026-10-25T03:00:00Z'), cut)).toBe('2026-10-25')
  })
  it('todayISO usa el corte indicado y madridDateISO no aplica ninguno', () => {
    const d = new Date('2026-11-11T02:59:00Z')
    expect(todayISO(d, cut)).toBe('2026-11-10')
    expect(madridDateISO(d)).toBe('2026-11-11')
  })
  it('parseCutoff valida HH:MM', () => {
    expect(parseCutoff('04:00')).toBe(240)
    expect(parseCutoff('4:30')).toBe(270)
    expect(parseCutoff('24:00')).toBeNull()
    expect(parseCutoff('04:60')).toBeNull()
    expect(parseCutoff('')).toBeNull()
    expect(parseCutoff(null)).toBeNull()
  })
})
