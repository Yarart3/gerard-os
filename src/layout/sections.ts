import type { ComponentType, SVGProps } from 'react'
import { Calendar, Dumbbell, Person, Speech, Sun } from '../components/ui/icons'
import type { Option } from '../components/ui/SegmentedControl'

export type SectionId = 'today' | 'gym' | 'agenda' | 'english' | 'personal'

export type NavItem = {
  id: SectionId
  path: string
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>
}

export type SectionDef = NavItem & {
  subnav?: { kind: 'segmented' | 'chips'; options: readonly Option<string>[] }
}

export const SECTIONS: readonly SectionDef[] = [
  { id: 'today', path: '/', label: 'Hoy', Icon: Sun },
  {
    id: 'gym',
    path: '/gym',
    label: 'Gym',
    Icon: Dumbbell,
    subnav: {
      kind: 'segmented',
      options: [
        { value: 'entreno', label: 'Entreno' },
        { value: 'historial', label: 'Historial' },
        { value: 'catalogo', label: 'Catálogo' },
        { value: 'nutricion', label: 'Nutrición' },
      ],
    },
  },
  {
    id: 'agenda',
    path: '/agenda',
    label: 'Agenda',
    Icon: Calendar,
    subnav: {
      kind: 'segmented',
      options: [
        { value: 'calendario', label: 'Calendario' },
        { value: 'uni', label: 'Uni' },
      ],
    },
  },
  {
    id: 'english',
    path: '/ingles',
    label: 'Inglés',
    Icon: Speech,
    subnav: {
      kind: 'chips',
      options: [
        { value: 'hoy', label: 'Hoy' },
        { value: 'reformular', label: 'Reformular' },
        { value: 'vocabulario', label: 'Vocabulario' },
        { value: 'oido', label: 'Oído' },
        { value: 'canciones', label: 'Canciones' },
        { value: 'gramatica', label: 'Gramática' },
        { value: 'orden', label: 'Orden de palabras' },
      ],
    },
  },
  {
    id: 'personal',
    path: '/personal',
    label: 'Personal',
    Icon: Person,
    subnav: {
      kind: 'segmented',
      options: [
        { value: 'gastos', label: 'Gastos' },
        { value: 'watchlist', label: 'Watchlist' },
        { value: 'notas', label: 'Notas' },
      ],
    },
  },
]
