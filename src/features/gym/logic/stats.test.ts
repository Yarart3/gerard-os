import { e1rm, personalRecords, progression, weeklySummary, workoutVolume, type HistWorkout } from './stats'

const set = (weight_kg: number | null, reps: number | null, done = true) => ({
  weight_kg,
  reps,
  seconds: null,
  meters: null,
  calories: null,
  done,
})

const W: HistWorkout[] = [
  {
    id: 'a',
    date: '2026-11-02',
    duration_min: 60,
    met_kcal: 400,
    watch_kcal: null,
    items: [{ exercise_id: 'squat', sets: [set(100, 5), set(105, 3), set(120, 1, false)] }],
  },
  {
    id: 'b',
    date: '2026-11-05',
    duration_min: 50,
    met_kcal: 350,
    watch_kcal: 500,
    items: [{ exercise_id: 'squat', sets: [set(105, 5)] }],
  },
  {
    id: 'c',
    date: '2026-11-10',
    duration_min: 40,
    met_kcal: 300,
    watch_kcal: null,
    items: [{ exercise_id: 'pullup', sets: [set(null, 12)] }],
  },
]

describe('stats', () => {
  it('el volumen solo cuenta series hechas', () => {
    expect(workoutVolume(W[0]!)).toBe(100 * 5 + 105 * 3)
  })
  it('1RM de Epley', () => {
    expect(e1rm(100, 1)).toBe(100)
    expect(e1rm(100, 30)).toBe(200)
  })
  it('PR por ejercicio: máximo y desempate por repes', () => {
    const prs = personalRecords(W, (id) => (id === 'squat' ? 'kg' : 'reps'))
    expect(prs.get('squat')).toMatchObject({ value: 105, reps: 5, date: '2026-11-05' })
    expect(prs.get('squat')?.e1rm).toBeCloseTo(122.5)
    expect(prs.get('pullup')).toMatchObject({ value: 12 })
  })
  it('progresión cronológica', () => {
    expect(progression(W, 'squat', 'kg').map((p) => p.value)).toEqual([105, 105])
  })
  it('resumen semanal de lunes a domingo; kcal del reloj si existe', () => {
    const weeks = weeklySummary(W)
    expect(weeks.map((w) => w.week)).toEqual(['2026-11-09', '2026-11-02'])
    expect(weeks[1]).toMatchObject({ sessions: 2, kcal: 900 })
  })
})
