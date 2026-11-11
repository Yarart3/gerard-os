import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import s from './Toast.module.css'

type Tone = 'default' | 'error'
type ToastFn = (message: string, tone?: Tone) => void

const ToastContext = createContext<ToastFn>(() => {})

/** Aviso breve en la parte inferior. Usa role=status para lectores de pantalla. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: Tone; id: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const show = useCallback<ToastFn>((message, tone = 'default') => {
    clearTimeout(timer.current)
    setToast({ message, tone, id: Date.now() })
    timer.current = setTimeout(() => setToast(null), 2800)
  }, [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={s.region} role="status" aria-live="polite">
        {toast && (
          <div key={toast.id} className={`${s.toast} ${toast.tone === 'error' ? s.error : ''}`}>
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)
