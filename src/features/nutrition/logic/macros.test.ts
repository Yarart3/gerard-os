import { foodMacros, kcalFromMacros, mealItemMacros, recipePer100, recipeTotals, sumMacros } from './macros'

const avena = { kcal: 375, protein: 14, carbs: 59, fat: 7, fiber: 10 }
const huevo = { kcal: 72, protein: 6.4, carbs: 0.4, fat: 4.9, fiber: 0 }
const platano = { kcal: 91, protein: 1.1, carbs: 22, fat: 0.3, fiber: 2.4 }
const foods = new Map([
  ['avena', avena],
  ['huevo', huevo],
  ['platano', platano],
])
const tortitas = {
  id: 'tortitas',
  items: [
    { food_id: 'huevo', grams: 200 },
    { food_id: 'avena', grams: 30 },
    { food_id: 'platano', grams: 100 },
  ],
}

describe('macros', () => {
  it('escala un alimento por gramos', () => {
    expect(foodMacros(avena, 60)).toEqual({ kcal: 225, protein: 8.4, carbs: 35.4, fat: 4.2, fiber: 6 })
  })
  it('suma los ingredientes de una receta', () => {
    const { total, grams } = recipeTotals(tortitas, foods)
    expect(grams).toBe(330)
    expect(total.kcal).toBeCloseTo(144 + 112.5 + 91)
    expect(total.protein).toBeCloseTo(12.8 + 4.2 + 1.1)
  })
  it('ignora ingredientes sin alimento', () => {
    const r = {
      id: 'x',
      items: [
        { food_id: 'nope', grams: 50 },
        { food_id: 'avena', grams: 100 },
      ],
    }
    expect(recipeTotals(r, foods)).toMatchObject({ grams: 100, total: { kcal: 375 } })
  })
  it('macros por 100 g de receta y raciones en el registro', () => {
    const per100 = recipePer100(tortitas, foods)
    expect(per100.kcal).toBeCloseTo((347.5 / 330) * 100)
    const recipes = new Map([['tortitas', tortitas]])
    const half = mealItemMacros({ food_id: null, recipe_id: 'tortitas', grams: 165 }, foods, recipes)
    expect(half.kcal).toBeCloseTo(347.5 / 2)
    expect(mealItemMacros({ food_id: 'avena', recipe_id: null, grams: 40 }, foods, recipes).kcal).toBe(150)
  })
  it('suma listas y calcula kcal 4/4/9', () => {
    expect(sumMacros([avena, huevo]).kcal).toBe(447)
    expect(kcalFromMacros(150, 200, 60)).toBe(1940)
  })
})
