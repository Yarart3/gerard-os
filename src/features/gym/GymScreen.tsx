import { CatalogTab } from './catalog/CatalogTab'
import { HistoryTab } from './history/HistoryTab'
import { WorkoutTab } from './workout/WorkoutTab'

/** Contenido de Entreno según el apartado (Entreno · Historial · Catálogo). */
export default function GymScreen({ sub }: { sub: string }) {
  switch (sub) {
    case 'historial':
      return <HistoryTab />
    case 'catalogo':
      return <CatalogTab />
    default:
      return <WorkoutTab />
  }
}
