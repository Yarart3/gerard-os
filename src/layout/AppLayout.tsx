import { Outlet } from 'react-router-dom'
import { Sidebar, TabBar } from '../components/ui'
import { NAV } from './sections'
import { QuickAdd } from './QuickAdd'
import { SyncStatus } from './SyncStatus'
import s from './AppLayout.module.css'

export function AppLayout() {
  return (
    <div className={s.shell}>
      <Sidebar items={NAV} />
      <main className={s.main}>
        <div className={s.content}>
          <SyncStatus />
          <Outlet />
        </div>
      </main>
      <QuickAdd />
      <TabBar items={NAV} />
    </div>
  )
}
