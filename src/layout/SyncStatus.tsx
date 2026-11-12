import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '../components/ui'
import { useOnline } from '../lib/offline/connectivity'
import { discardFailed, pendingText, savedText, usePendingChanges } from '../lib/offline/pending'
import s from './SyncStatus.module.css'

/** Una escritura normal con red tarda menos: no se anuncia para no parpadear. */
const SLOW_MS = 700

/** Aviso discreto del estado de la cola offline (sin conexión, sincronizando, cambios fallidos). */
export function SyncStatus() {
  const qc = useQueryClient()
  const toast = useToast()
  const online = useOnline()
  const { queued, failed } = usePendingChanges()
  const [slow, setSlow] = useState(false)
  const episode = useRef({ announced: false, max: 0 })
  const prevFailed = useRef(0)

  // Online con cambios en cola: solo se anuncia si tardan.
  useEffect(() => {
    if (!online || queued === 0) return
    const t = setTimeout(() => setSlow(true), SLOW_MS)
    return () => {
      clearTimeout(t)
      setSlow(false)
    }
  }, [online, queued])

  const visibleQueue = queued > 0 && (!online || slow)

  // Al vaciarse una cola que se había mostrado: "N cambios guardados".
  useEffect(() => {
    const ep = episode.current
    if (queued > 0) {
      ep.max = Math.max(ep.max, queued)
      if (visibleQueue) ep.announced = true
    } else {
      if (ep.announced && ep.max > 0 && failed === 0) toast(savedText(ep.max))
      ep.announced = false
      ep.max = 0
    }
  }, [queued, visibleQueue, failed, toast])

  useEffect(() => {
    if (failed > prevFailed.current) toast('Un cambio no se ha podido guardar', 'error')
    prevFailed.current = failed
  }, [failed, toast])

  let text = ''
  if (!online) text = queued ? pendingText(queued) : 'Sin conexión'
  else if (visibleQueue) text = 'Sincronizando…'

  return (
    <div className={s.region}>
      <div role="status" aria-live="polite">
        {text && <p className={`${s.pill} ${online ? s.syncing : s.offline}`}>{text}</p>}
      </div>
      {failed > 0 && (
        <div className={`${s.pill} ${s.error}`} role="alert">
          <span>
            {failed === 1
              ? 'Un cambio no se ha podido guardar'
              : `${failed} cambios no se han podido guardar`}
          </span>
          <button type="button" className={s.discard} onClick={() => void discardFailed(qc)}>
            Descartar
          </button>
        </div>
      )}
    </div>
  )
}
