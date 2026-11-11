import { CatalogTab } from './catalog/CatalogTab'
import { HistoryTab } from './history/HistoryTab'
import { NutritionTab } from '../nutrition/NutritionTab'
import { WorkoutTab } from './workout/WorkoutTab'

/** Contenido de Gym según el apartado (Entreno · Historial · Catálogo · Nutrición). */
export default function GymScreen({ sub }: { sub: string }) {
  switch (sub) {
    case 'historial':
      return <HistoryTab />
    case 'catalogo':
      return <CatalogTab />
    case 'nutricion':
      return <NutritionTab />
    default:
      return <WorkoutTab />
  }
}
