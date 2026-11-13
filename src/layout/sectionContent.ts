import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { SectionId } from './sections'

type Lazy<P> = LazyExoticComponent<ComponentType<P>>

/** Pantalla de cada sección (carga diferida: Recharts pesa). Los ajustes viven todos en /ajustes. */
export const SECTION_CONTENT: Partial<Record<SectionId, { Screen: Lazy<{ sub: string }> }>> = {
  today: { Screen: lazy(() => import('../features/today/TodayScreen')) },
  training: { Screen: lazy(() => import('../features/gym/GymScreen')) },
  food: { Screen: lazy(() => import('../features/nutrition/NutritionScreen')) },
  agenda: { Screen: lazy(() => import('../features/agenda/AgendaScreen')) },
  more: { Screen: lazy(() => import('./MoreScreen')) },
  english: { Screen: lazy(() => import('../features/english/EnglishScreen')) },
  personal: { Screen: lazy(() => import('../features/personal/PersonalScreen')) },
}
