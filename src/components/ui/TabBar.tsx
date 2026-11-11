import { NavLink } from 'react-router-dom'
import type { NavItem } from '../../layout/sections'
import s from './TabBar.module.css'

/** Barra inferior translúcida (solo móvil, <900px). */
export function TabBar({ items, preview }: { items: readonly NavItem[]; preview?: boolean }) {
  return (
    <nav className={`${s.bar} ${preview ? s.preview : ''}`} aria-label="Secciones">
      {items.map(({ path, label, Icon }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          className={({ isActive }) => `${s.tab} ${isActive ? s.active : ''}`}
        >
          <Icon size={24} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
