import { cleanLine, matchWod, normalize, similarity, suggestName } from './wodMatch'

const catalog = [
  { id: '1', name: 'Thruster', aliases: [] },
  { id: '2', name: 'Pull-up', aliases: ['Dominadas', 'Pull ups'] },
  { id: '3', name: 'Sentadilla frontal', aliases: ['Front squat'] },
  { id: '4', name: 'Press de banca', aliases: ['Bench press'] },
  { id: '5', name: 'Remo', aliases: ['Row'] },
  { id: '6', name: 'Double unders', aliases: ['DU'] },
]

describe('normalize / cleanLine', () => {
  it('quita mayúsculas, acentos y signos', () => {
    expect(normalize('  Sentadilla  FRONTAL! ')).toBe('sentadilla frontal')
    expect(normalize('Élévation')).toBe('elevation')
  })
  it('elimina cantidades, pesos y formato', () => {
    expect(cleanLine('21-15-9 Thrusters (43/29 kg)')).toBe('thrusters')
    expect(cleanLine('400m Row')).toBe('row')
    expect(cleanLine('AMRAP 12 min:')).toBe('')
    expect(cleanLine('5x5 Back Squat @ 80kg')).toBe('back squat')
  })
})

describe('similarity', () => {
  it('es 1 para iguales y alta para erratas', () => {
    expect(similarity('thruster', 'thruster')).toBe(1)
    expect(similarity('thuster', 'thruster')).toBeGreaterThan(0.8)
    expect(similarity('remo', 'thruster')).toBeLessThan(0.5)
  })
})

describe('matchWod', () => {
  const wod = `For time:
21-15-9
Thrusters (43/29 kg)
pull ups
DOMINADAS
400m Row
Sentadilla Frontal 5x5
Burpee box jump over
Rest 2 min`

  it('encuentra ejercicios por nombre, plural, alias y sin acentos', () => {
    const res = matchWod(wod, catalog)
    const ids = res.map((r) => r.match?.id ?? `nuevo:${r.query}`)
    expect(ids).toEqual(['1', '2', '5', '3', 'nuevo:burpee box jump over'])
  })

  it('usa similitud difusa para erratas', () => {
    const [r] = matchWod('Thuster 10 reps', catalog)
    expect(r?.match?.id).toBe('1')
  })

  it('marca los desconocidos y propone nombre', () => {
    const [r] = matchWod('Wall balls 9kg', catalog)
    expect(r?.match).toBeNull()
    expect(suggestName(r!.query)).toBe('Wall Balls')
  })

  it('los alias del catálogo cuentan, incluso en otro idioma', () => {
    expect(matchWod('3x8 Bench Press', catalog)[0]?.match?.id).toBe('4')
    expect(matchWod('50 DU', catalog)[0]?.match?.id).toBe('6')
  })
})
