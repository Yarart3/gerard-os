import { weekTable } from './weekly'

const m = (kcal: number) => ({ kcal, protein: kcal / 10, carbs: 0, fat: 0, fiber: 0 })

describe('weekTable', () => {
  it('suma por día, por comida y en total; ignora fechas fuera de la semana', () => {
    const days = ['2026-11-09', '2026-11-10']
    const t = weekTable(
      [
        { date: '2026-11-09', slot: 'Desayuno', items: [300, 100] },
        { date: '2026-11-09', slot: 'Cena', items: [600] },
        { date: '2026-11-10', slot: 'Desayuno', items: [400] },
        { date: '2026-11-20', slot: 'Cena', items: [999] },
      ],
      days,
      m,
    )
    expect(t.cell('2026-11-09', 'Desayuno')).toBe(400)
    expect(t.cell('2026-11-10', 'Cena')).toBe(0)
    expect(t.dayTotals.get('2026-11-09')?.kcal).toBe(1000)
    expect(t.slotTotals.get('Desayuno')).toBe(800)
    expect(t.total).toMatchObject({ kcal: 1400, protein: 140 })
    expect(t.daysWithData).toBe(2)
  })
})
