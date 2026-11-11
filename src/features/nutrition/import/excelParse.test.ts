import {
  nameKey,
  parseFoods,
  parseMenu,
  parseRecipes,
  parseWeekRange,
  plain,
  resolveWeekYears,
  toNumber,
} from './excelParse'

describe('celdas', () => {
  it('lee fórmulas, texto enriquecido y comas decimales', () => {
    expect(plain({ formula: 'SUM(A1)', result: 4.5 })).toBe(4.5)
    expect(plain({ richText: [{ text: 'Hola ' }, { text: 'mundo' }] })).toBe('Hola mundo')
    expect(toNumber('0,5')).toBe(0.5)
    expect(toNumber(' 15,7 ')).toBe(15.7)
    expect(toNumber('abc')).toBeNull()
    expect(nameKey('  Proteína   en polvo ')).toBe('proteina en polvo')
  })
})

describe('parseWeekRange', () => {
  it('lee "dd/mm - dd/mm"', () => {
    expect(parseWeekRange('03/08 - 09/08')).toEqual({ startDay: 3, startMonth: 8, endDay: 9, endMonth: 8 })
    expect(parseWeekRange('28/12 - 03/01')).toEqual({ startDay: 28, startMonth: 12, endDay: 3, endMonth: 1 })
    expect(parseWeekRange('Semana 1')).toBeNull()
  })
})

describe('resolveWeekYears', () => {
  const weeks = ['03/08 - 09/08', '10/08 - 16/08', '21/12 - 27/12', '28/12 - 03/01', '04/01 - 10/01']

  it('deduce el año en que la primera semana empieza en lunes y cruza de año', () => {
    const r = resolveWeekYears(weeks, '2026-11-12')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.firstYear).toBe(2026)
    expect(r.starts.get('03/08 - 09/08')).toBe('2026-08-03')
    expect(r.starts.get('28/12 - 03/01')).toBe('2026-12-28')
    expect(r.starts.get('04/01 - 10/01')).toBe('2027-01-04')
    // falta de semanas intermedias → aviso, no error
    expect(r.warnings.some((w) => w.includes('21/12'))).toBe(true)
  })

  it('no adivina si ningún año reciente encaja', () => {
    const r = resolveWeekYears(['06/08 - 12/08'], '2026-11-12')
    expect(r.ok).toBe(false)
  })

  it('acepta un año forzado', () => {
    const r = resolveWeekYears(['04/08 - 10/08'], '2026-11-12', 2025)
    expect(r.ok && r.starts.get('04/08 - 10/08')).toBe('2025-08-04')
  })
})

describe('hojas', () => {
  it('Alimentos: comas, espacios, repetidos y filas sin macros', () => {
    const { foods, skipped } = parseFoods([
      ['Nombre', 'Calorías/100g'],
      ['Claras de huevo', 42, 11, '0,5', '0,5', 0],
      ['Pasta lentejas', 334, 26, 50, 1.7, 7.6],
      ['Pasta lentejas ', 334, 26, 50, 1.7, 7.6],
      ['Proteína en polvo ', 408, 82, 5.8, 6.4],
      ['Empanadilla casera'],
    ])
    expect(foods.map((f) => f.name)).toEqual(['Claras de huevo', 'Pasta lentejas', 'Proteína en polvo'])
    expect(foods[0]).toMatchObject({ carbs: 0.5, fat: 0.5 })
    expect(foods[2]?.fiber).toBe(0)
    expect(skipped).toHaveLength(2)
  })

  it('Recetas: pares Alimento/Cantidad e ignora notas de ayuda', () => {
    const f = { formula: 'x', result: 0 }
    const { recipes, skipped } = parseRecipes([
      ['BASE DE DATOS DE RECETAS'],
      ['Nombre de la receta', 'Fotografía', 'Ingredientes'],
      ['Tortitas proteica', null, null, f, f, f, f, f, 'Huevo', 200, 'Avena', 30, 'Plátano', 100],
      ['Carne picada con patatas', null, 'Carne picada; patatas', f, f],
      [null, null, null, f, f],
      ['Nota: puedes borrar o sustituir las recetas de ejemplo.'],
    ])
    expect(recipes).toHaveLength(2)
    expect(recipes[0]?.items).toEqual([
      { food: 'Huevo', grams: 200 },
      { food: 'Avena', grams: 30 },
      { food: 'Plátano', grams: 100 },
    ])
    expect(recipes[1]).toMatchObject({ notes: 'Carne picada; patatas', items: [] })
    expect(skipped.map((s) => s.reason)).toContain('Nota de ayuda')
  })

  it('Datos_Menu: fecha real, comidas vacías y alimentos sin coincidencia', () => {
    const starts = new Map([['03/08 - 09/08', '2026-08-03']])
    const foods = new Set(['gelatina', 'pechugas de pollo', 'yogur fresa proteina'])
    const { meals, skipped, unmatched, empty } = parseMenu(
      [
        ['Semana', 'Día', 'Momento'],
        ['03/08 - 09/08', 'Lunes', 'Merienda', 'Gelatina', 200, null, 200],
        ['03/08 - 09/08', 'Miércoles', 'Desayuno'],
        ['03/08 - 09/08', 'Jueves', 'Comida', 'Pechugas de pollo', 215, 'Pizza', 100, 'Yogur fresa proteina'],
      ],
      starts,
      foods,
      new Set(),
    )
    expect(meals).toEqual([
      {
        date: '2026-08-03',
        slot: 'Merienda',
        items: [{ kind: 'food', name: 'Gelatina', grams: 200 }],
        row: 2,
      },
      {
        date: '2026-08-06',
        slot: 'Comida',
        items: [{ kind: 'food', name: 'Pechugas de pollo', grams: 215 }],
        row: 4,
      },
    ])
    expect(empty).toBe(1)
    expect([...unmatched.keys()]).toEqual(['Pizza'])
    expect(skipped).toHaveLength(3)
  })
})
