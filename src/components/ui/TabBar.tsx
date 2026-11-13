import { Link, useLocation } from 'react-router-dom'
import { isNavActive, type NavItem } from '../../layout/sections'
import s from './TabBar.module.css'

/** Barra inferior translúcida (solo móvil, <900px). Al tocar una pestaña se vuelve a su último apartado. */
export function TabBar({ items, preview }: { items: readonly NavItem[]; preview?: boolean }) {
  const { pathname } = useLocation()
  return (
    <nav className={`${s.bar} ${preview ? s.preview : ''}`} aria-label="Secciones">
      {items.map((item) => {
        const active = isNavActive(item, pathname)
        return (
          <Link
            key={item.path}
            to={item.path}
            state={{ fromTab: true }}
            aria-current={active ? 'page' : undefined}
            className={`${s.tab} ${active ? s.active : ''}`}
          >
            <item.Icon size={24} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
