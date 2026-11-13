import { lazy, Suspense, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus } from '../components/ui/icons'
import s from './QuickAdd.module.css'

// Las hojas (comida, gasto, nota) solo se descargan al tocar el botón.
const QuickAddSheet = lazy(() => import('./QuickAddSheet'))

/** Botón flotante «+» para apuntar al momento desde cualquier pantalla. */
export function QuickAdd() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  if (pathname.startsWith('/ajustes')) return null
  return (
    <>
      <button type="button" className={s.fab} aria-label="Apuntar rápido" onClick={() => setOpen(true)}>
        <Plus size={26} />
      </button>
      {open && (
        <Suspense fallback={null}>
          <QuickAddSheet onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  )
}
