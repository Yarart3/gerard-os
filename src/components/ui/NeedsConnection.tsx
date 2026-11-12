import { useOnline } from '../../lib/offline/connectivity'
import s from './NeedsConnection.module.css'

/** Aviso "Necesita conexión" para lo que requiere servidor (iCloud, IA, exportar…). No muestra nada con red. */
export function NeedsConnection({ className = '' }: { className?: string }) {
  const online = useOnline()
  if (online) return null
  return (
    <p className={`${s.note} ${className}`} role="status">
      Necesita conexión
    </p>
  )
}
