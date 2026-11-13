import { ageFrom, combinedKcal, energyMethods, mifflinRmr, type EnergyInput } from './calories'

const set = (weight_kg: number, reps: number, done = true) => ({
  done,
  weight_kg,
  reps,
  seconds: null,
  meters: null,
  calories: null,
})
const input: EnergyInput = {
  items: [{ type: 'strength', met: 5, unit: 'kg', sets: [set(60, 8), set(60, 8), set(60, 8), set(60, 8, false)] }],
  minutes: 60,
  avgHr: 130,
  body: { weight_kg: 75, height_cm: 180, age: 30, sex: 'male' },
}
const byId = (i: EnergyInput) => Object.fromEntries(energyMethods(i).map((r) => [r.id, r.kcal]))

describe('calorías del entreno', () => {
  it('edad y basal (Mifflin-St Jeor)', () => {
    expect(ageFrom('1996-11-14', new Date(2026, 10, 13))).toBe(29)
    expect(ageFrom('1996-11-13', new Date(2026, 10, 13))).toBe(30)
    expect(mifflinRmr(input.body)).toBe(1730)
    expect(mifflinRmr({ ...input.body, sex: 'female' })).toBe(1564)
  })
  it('calcula cada método', () => {
    expect(byId(input)).toEqual({
      met: 394, // 5 × 3,5 × 75 / 200 × 60
      met_rmr: 360, // 5 × 1730/1440 × 60
      activity: 168, // 96 s de trabajo a 7 MET + 58,4 min a 2 MET
      heart_rate: 687, // Keytel hombre, 130 ppm
      mechanical: 92, // 8,5 kJ / 20 % + basal, +12 % EPOC
    })
  })
  it('la combinada es la mediana de las disponibles', () => {
    expect(combinedKcal(energyMethods(input))).toBe(360)
    const noHr = energyMethods({ ...input, avgHr: null })
    expect(noHr.find((r) => r.id === 'heart_rate')).toMatchObject({ kcal: null, note: 'Apunta el pulso medio del Apple Watch' })
    expect(combinedKcal(noHr)).toBe(264) // (168 + 360) / 2
  })
  it('sin peso o sin duración no inventa números', () => {
    const r = energyMethods({ ...input, minutes: null, body: { ...input.body, weight_kg: null } })
    expect(r.every((x) => x.kcal === null)).toBe(true)
    expect(combinedKcal(r)).toBeNull()
  })
})
