import { NavLink } from 'react-router-dom'
import type { NavItem } from '../../layout/sections'
import { Gear } from './icons'
import s from './Sidebar.module.css'

/** Barra lateral de escritorio con Ajustes fijo abajo. */
export function Sidebar({ items, preview }: { items: readonly NavItem[]; preview?: boolean }) {
  const cls = ({ isActive }: { isActive: boolean }) => `${s.item} ${isActive ? s.active : ''}`
  return (
    <nav className={`${s.sidebar} ${preview ? s.preview : ''}`} aria-label="Secciones">
      <div className={s.brand}>Gerard OS</div>
      <div className={s.list}>
        {items.map(({ path, label, Icon }) => (
          <NavLink key={path} to={path} end={path === '/'} className={cls}>
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
      </div>
      <NavLink to="/ajustes" className={cls}>
        <Gear size={22} />
        Ajustes
      </NavLink>
    </nav>
  )
}
