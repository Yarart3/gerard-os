import { DiaryView } from './DiaryView'
import { FoodsView } from './FoodsView'
import { RecipesView } from './RecipesView'
import { WeekView } from './WeekView'

/** Contenido de Comida según el apartado (Diario · Semana · Alimentos · Recetas). */
export default function NutritionScreen({ sub }: { sub: string }) {
  switch (sub) {
    case 'semana':
      return <WeekView />
    case 'alimentos':
      return <FoodsView />
    case 'recetas':
      return <RecipesView />
    default:
      return <DiaryView />
  }
}
