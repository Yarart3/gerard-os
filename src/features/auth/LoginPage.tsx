import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from './AuthProvider'
import s from './LoginPage.module.css'

const EMAIL_KEY = 'hub.lastEmail'

function readLastEmail() {
  try {
    return localStorage.getItem(EMAIL_KEY) ?? ''
  } catch {
    return ''
  }
}

/**
 * Login por email: enlace mágico + código de un solo uso.
 * El código es necesario en la PWA del iPhone, que no comparte sesión con Safari.
 * shouldCreateUser: false → solo puede entrar un usuario que ya exista.
 */
export function LoginPage() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState(readLastEmail)
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && session) return <Navigate to="/" replace />

  const send = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: window.location.origin + window.location.pathname,
      },
    })
    setBusy(false)
    if (error) {
      setError('No se ha podido enviar el correo. Comprueba la dirección o espera un minuto.')
      return
    }
    try {
      localStorage.setItem(EMAIL_KEY, email.trim())
    } catch {
      /* almacenamiento no disponible */
    }
    setStep('code')
  }

  const verify = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    })
    setBusy(false)
    if (error) setError('Código incorrecto o caducado.')
  }

  return (
    <main className={s.wrap}>
      <div className={s.box}>
        <img
          src={`${import.meta.env.BASE_URL}favicon.svg`}
          alt=""
          className={s.logo}
          width={64}
          height={64}
        />
        <h1 className={s.title}>Gerard OS</h1>
        {step === 'email' ? (
          <form onSubmit={send} className={s.form}>
            <p className={s.lead}>Te enviaremos un enlace y un código para entrar.</p>
            <label className="field">
              <span className="visually-hidden">Email</span>
              <input
                className="input"
                type="email"
                autoComplete="email"
                required
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Enviando…' : 'Enviar enlace'}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className={s.form}>
            <p className={s.lead}>
              Revisa tu correo. Abre el enlace o escribe aquí el código (en la app instalada del iPhone, usa
              el código).
            </p>
            <label className="field">
              <span className="visually-hidden">Código</span>
              <input
                className={`input ${s.code}`}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6,10}"
                required
                placeholder="Código"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            </label>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Comprobando…' : 'Entrar'}
            </button>
            <button type="button" className="btn btn-plain" onClick={() => setStep('email')}>
              Cambiar email
            </button>
          </form>
        )}
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  )
}
