import { Outlet } from 'react-router-dom'
import { Sidebar, TabBar } from '../components/ui'
import { SECTIONS } from './sections'
import s from './AppLayout.module.css'

export function AppLayout() {
  return (
    <div className={s.shell}>
      <Sidebar items={SECTIONS} />
      <main className={s.main}>
        <div className={s.content}>
          <Outlet />
        </div>
      </main>
      <TabBar items={SECTIONS} />
    </div>
  )
}
