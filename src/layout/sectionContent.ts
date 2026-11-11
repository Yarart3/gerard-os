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
}
