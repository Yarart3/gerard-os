import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Close } from './icons'
import s from './Sheet.module.css'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  theme?: 'light' | 'dark' // fuerza un tema (solo /dev/ui)
}

/** Panel inferior con asa (en escritorio, centrado). Cierra con Escape, el fondo o la X. */
export function Sheet({ open, onClose, title, children, theme }: Props) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className={s.layer} data-theme={theme}>
      <div className={s.scrim} onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        className={s.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={s.handle} aria-hidden="true" />
        <header className={s.header}>
          <h2 id={titleId} className={s.title}>
            {title}
          </h2>
          <button type="button" className={s.close} onClick={onClose} aria-label="Cerrar">
            <Close size={18} />
          </button>
        </header>
        <div className={s.body}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
