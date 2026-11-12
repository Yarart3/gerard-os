import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { SectionId } from './sections'

type Lazy<P> = LazyExoticComponent<ComponentType<P>>

/** Pantallas y ajustes ya construidos de cada sección (carga diferida: Recharts pesa). */
export const SECTION_CONTENT: Partial<
  Record<SectionId, { Screen: Lazy<{ sub: string }>; Settings?: Lazy<object> }>
> = {
  gym: {
    Screen: lazy(() => import('../features/gym/GymScreen')),
    Settings: lazy(() => import('../features/gym/GymSettingsPanel')),
  },
  agenda: {
    Screen: lazy(() => import('../features/agenda/AgendaScreen')),
    Settings: lazy(() => import('../features/agenda/AgendaSettingsPanel')),
  },
  english: {
    Screen: lazy(() => import('../features/english/EnglishScreen')),
    Settings: lazy(() => import('../features/english/EnglishSettingsPanel')),
  },
  personal: {
    Screen: lazy(() => import('../features/personal/PersonalScreen')),
    Settings: lazy(() => import('../features/personal/PersonalSettingsPanel')),
  },
}
