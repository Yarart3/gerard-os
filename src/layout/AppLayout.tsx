import { Outlet } from 'react-router-dom'
import { Sidebar, TabBar } from '../components/ui'
import { SECTIONS } from './sections'
import { SyncStatus } from './SyncStatus'
import s from './AppLayout.module.css'

export function AppLayout() {
  return (
    <div className={s.shell}>
      <Sidebar items={SECTIONS} />
      <main className={s.main}>
        <div className={s.content}>
          <SyncStatus />
          <Outlet />
        </div>
      </main>
      <TabBar items={SECTIONS} />
    </div>
  )
}
