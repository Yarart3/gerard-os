import { suggestedSlot } from './slots'

const SLOTS = ['Desayuno', 'Comida', 'Merienda', 'Cena']
const at = (hhmmUtc: string) => new Date(`2026-11-13T${hhmmUtc}:00Z`) // Madrid = UTC+1 en noviembre

describe('comida sugerida por la hora', () => {
  it('reparte las cuatro comidas por franjas de Madrid', () => {
    expect(suggestedSlot(SLOTS, at('07:30'))).toBe('Desayuno') // 08:30
    expect(suggestedSlot(SLOTS, at('13:00'))).toBe('Comida') // 14:00
    expect(suggestedSlot(SLOTS, at('16:30'))).toBe('Merienda') // 17:30
    expect(suggestedSlot(SLOTS, at('20:00'))).toBe('Cena') // 21:00
  })
  it('con menos comidas o ninguna', () => {
    expect(suggestedSlot(['Desayuno', 'Cena'], at('20:00'))).toBe('Cena')
    expect(suggestedSlot([], at('20:00'))).toBeUndefined()
  })
})
