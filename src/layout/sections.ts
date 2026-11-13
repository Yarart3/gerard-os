import type { ComponentType, SVGProps } from 'react'
import { Calendar, Dumbbell, Fork, Grid, Speech, Sun, Wallet } from '../components/ui/icons'
import type { Option } from '../components/ui/SegmentedControl'

export type SectionId = 'today' | 'training' | 'food' | 'agenda' | 'more' | 'english' | 'personal'

/** Apartado de la página única de Ajustes (anclas de `#/ajustes?s=<id>`). */
export type SettingsId =
  | 'perfil'
  | 'apariencia'
  | 'hoy'
  | 'entreno'
  | 'comida'
  | 'agenda'
  | 'ingles'
  | 'personal'
  | 'datos'

type IconC = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

export type NavItem = {
  id: SectionId
  path: string
  label: string
  Icon: IconC
  /** Rutas que también marcan esta pestaña como activa (p. ej. «Más» con Inglés y Personal). */
  match?: readonly string[]
  /** Sub-enlaces en la barra lateral de escritorio. */
  children?: readonly { path: string; label: string; Icon: IconC }[]
}

export type SectionDef = NavItem & {
  subnav?: { kind: 'segmented' | 'chips'; options: readonly Option<string>[] }
  /** Apartado de Ajustes al que lleva «Ajustar». */
  settings?: SettingsId
}

const today: SectionDef = { id: 'today', path: '/', label: 'Hoy', Icon: Sun, settings: 'hoy' }
const training: SectionDef = {
  id: 'training',
  path: '/entreno',
  label: 'Entreno',
  Icon: Dumbbell,
  settings: 'entreno',
  subnav: {
    kind: 'segmented',
    options: [
      { value: 'hoy', label: 'Entreno' },
      { value: 'historial', label: 'Historial' },
      { value: 'catalogo', label: 'Catálogo' },
    ],
  },
}
const food: SectionDef = {
  id: 'food',
  path: '/comida',
  label: 'Comida',
  Icon: Fork,
  settings: 'comida',
  subnav: {
    kind: 'segmented',
    options: [
      { value: 'diario', label: 'Diario' },
      { value: 'semana', label: 'Semana' },
      { value: 'alimentos', label: 'Alimentos' },
      { value: 'recetas', label: 'Recetas' },
    ],
  },
}
const agenda: SectionDef = {
  id: 'agenda',
  path: '/agenda',
  label: 'Agenda',
  Icon: Calendar,
  settings: 'agenda',
  subnav: {
    kind: 'segmented',
    options: [
      { value: 'calendario', label: 'Calendario' },
      { value: 'uni', label: 'Uni' },
    ],
  },
}
const english: SectionDef = {
  id: 'english',
  path: '/ingles',
  label: 'Inglés',
  Icon: Speech,
  settings: 'ingles',
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
}
const personal: SectionDef = {
  id: 'personal',
  path: '/personal',
  label: 'Personal',
  Icon: Wallet,
  settings: 'personal',
  subnav: {
    kind: 'segmented',
    options: [
      { value: 'gastos', label: 'Gastos' },
      { value: 'watchlist', label: 'Watchlist' },
      { value: 'notas', label: 'Notas' },
    ],
  },
}
const more: SectionDef = {
  id: 'more',
  path: '/mas',
  label: 'Más',
  Icon: Grid,
  match: ['/ingles', '/personal', '/ajustes'],
  children: [
    { path: '/ingles', label: 'Inglés', Icon: Speech },
    { path: '/personal', label: 'Personal', Icon: Wallet },
  ],
}

/** Pantallas con ruta propia (`/<path>/:sub?`). */
export const SECTIONS: readonly SectionDef[] = [today, training, food, agenda, more, english, personal]

/** Pestañas de la barra inferior y de la lateral: Hoy · Entreno · Comida · Agenda · Más. */
export const NAV: readonly NavItem[] = [today, training, food, agenda, more]

/** ¿La ruta `pathname` pertenece a la pestaña `item`? */
export function isNavActive(item: NavItem, pathname: string): boolean {
  const under = (p: string) => pathname === p || pathname.startsWith(`${p}/`)
  if (item.path === '/') return pathname === '/'
  return under(item.path) || (item.match ?? []).some(under)
}
