import { estimateOf, kcalTask, parseEnergy } from './energy'

describe('energía del entreno', () => {
  it('lee workouts.energy tolerando basura', () => {
    expect(parseEnergy(null)).toEqual({})
    expect(parseEnergy('x')).toEqual({})
    expect(estimateOf({ combined: 300 })).toBe(300)
    expect(
      estimateOf({ combined: 300, ai: { kcal: 420, low: 350, high: 480, confidence: 'media', explanation: 'ok' } }),
    ).toBe(420)
  })
  it('el prompt lleva los datos del entreno y valida el rango', () => {
    const task = kcalTask({
      items: [
        {
          exercise_id: 'e1',
          notes: null,
          sets: [{ done: true, weight_kg: 85, added_kg: 10, reps: 5, seconds: null, meters: null, calories: null }],
        },
      ],
      exercises: new Map([['e1', { name: 'Dominadas', type: 'gymnastics', unit: 'reps' }]]),
      minutes: 50,
      avgHr: 128,
      body: { weight_kg: 75, height_cm: 180, age: 30, sex: 'male' },
      formulas: [{ id: 'met', label: 'MET clásico', kcal: 300, note: 'x' }],
      notes: null,
    })
    expect(task.prompt).toContain('Dominadas [Gimnástico]: PC + 10 kg × 5')
    expect(task.prompt).toContain('128 ppm')
    expect(task.prompt).toContain('MET clásico: 300 kcal')
    const ok = { kcal: 400, low: 350, high: 450, confidence: 'media', explanation: 'Porque sí.' }
    expect(task.schema.safeParse(ok).success).toBe(true)
    expect(task.schema.safeParse({ ...ok, low: 500 }).success).toBe(false)
  })
})
