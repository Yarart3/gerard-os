import { Link, NavLink, useLocation } from 'react-router-dom'
import { isNavActive, type NavItem } from '../../layout/sections'
import { Gear } from './icons'
import s from './Sidebar.module.css'

/** Barra lateral de escritorio: las mismas pestañas (Más con sus apartados debajo) y Ajustes fijo abajo. */
export function Sidebar({ items, preview }: { items: readonly NavItem[]; preview?: boolean }) {
  const { pathname } = useLocation()
  const cls = (active: boolean, sub = false) => `${s.item} ${sub ? s.sub : ''} ${active ? s.active : ''}`
  return (
    <nav className={`${s.sidebar} ${preview ? s.preview : ''}`} aria-label="Secciones">
      <div className={s.brand}>Gerard OS</div>
      <div className={s.list}>
        {items.map((item) => {
          // «Más» solo se marca en su propia página: sus apartados tienen enlace propio debajo.
          const active = item.children ? pathname === item.path : isNavActive(item, pathname)
          return (
            <div key={item.path} className={s.group}>
              <Link
                to={item.path}
                state={{ fromTab: true }}
                aria-current={active ? 'page' : undefined}
                className={cls(active)}
              >
                <item.Icon size={22} />
                {item.label}
              </Link>
              {item.children?.map((c) => {
                const on = pathname === c.path || pathname.startsWith(`${c.path}/`)
                return (
                  <Link
                    key={c.path}
                    to={c.path}
                    state={{ fromTab: true }}
                    aria-current={on ? 'page' : undefined}
                    className={cls(on, true)}
                  >
                    <c.Icon size={20} />
                    {c.label}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </div>
      <NavLink to="/ajustes" className={({ isActive }) => cls(isActive)}>
        <Gear size={22} />
        Ajustes
      </NavLink>
    </nav>
  )
}
