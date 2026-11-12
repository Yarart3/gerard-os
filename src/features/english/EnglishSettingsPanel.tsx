import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, SegmentedControl, Sheet, useToast } from '../../components/ui'
import { fetchAiStatus, testAi } from './ai/client'
import { useProfile, useResetProgress, useSaveProfile } from './api'
import { ENGLISH_DEFAULTS, goalFor, useEnglishSettings } from './englishSettings'
import { DEFAULT_LEVEL, EMPTY_ANSWERS, LEVELS, type Level } from './profile'
import { ProfileForm } from './ProfileForm'
import { SPEEDS, englishVoices } from './speech'
import s from './English.module.css'

/** Ajustes de Inglés (CLAUDE.md §8) dentro del Sheet de la rueda. */
export default function EnglishSettingsPanel() {
  const toast = useToast()
  const cfg = useEnglishSettings()
  const profile = useProfile()
  const saveProfile = useSaveProfile()
  const reset = useResetProgress()
  const [editing, setEditing] = useState(false)
  const [testing, setTesting] = useState(false)
  const status = useQuery({ queryKey: ['english', 'ai-status'], queryFn: fetchAiStatus, retry: false })
  const current = profile.data ?? { level: DEFAULT_LEVEL, answers: EMPTY_ANSWERS }
  const voices = englishVoices()

  const save = (patch: Partial<typeof cfg.value>) =>
    cfg.save({ ...cfg.value, ...patch }).catch(() => toast('No se han podido guardar los ajustes', 'error'))

  const runTest = async () => {
    setTesting(true)
    try {
      const r = await testAi(cfg.value.ai_provider ?? undefined)
      toast(`IA operativa (${r.provider ?? 'ok'})`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'La IA no responde', 'error')
    } finally {
      setTesting(false)
    }
  }

  const doReset = async () => {
    if (!confirm('¿Reiniciar el progreso de Inglés? Se borran puntos, rachas e intentos y las tarjetas vuelven a la caja 1. Tus ejercicios y canciones se conservan.')) return
    try {
      await reset.mutateAsync()
      toast('Progreso reiniciado')
    } catch {
      toast('No se ha podido reiniciar', 'error')
    }
  }

  return (
    <>
      <Card title="Nivel">
        <SegmentedControl
          label="Nivel de inglés"
          options={LEVELS.map((l) => ({ value: l, label: l }))}
          value={current.level}
          onChange={(v) => void saveProfile.mutateAsync({ level: v as Level, answers: current.answers }).catch(() => toast('No se ha podido guardar', 'error'))}
        />
      </Card>

      <Card title="Objetivo diario">
        <label className="field">
          <span className="field-label">Puntos al día</span>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min={5}
            max={500}
            defaultValue={goalFor(cfg.value.daily_goal, current.answers.minutes)}
            key={cfg.value.daily_goal ?? 'auto'}
            onBlur={(e) => {
              const n = Number(e.target.value)
              if (n >= 5 && n <= 500) void save({ daily_goal: Math.round(n) })
            }}
          />
        </label>
      </Card>

      <Card title="Audio">
        <div className="field">
          <span className="field-label">Velocidad por defecto</span>
          <SegmentedControl
            label="Velocidad"
            options={SPEEDS.map((v) => ({ value: String(v), label: `${String(v).replace('.', ',')}×` }))}
            value={String(cfg.value.speed)}
            onChange={(v) => void save({ speed: Number(v) })}
          />
        </div>
        <p className={s.small}>El acento (británico, americano o alternar) se elige en las respuestas del perfil.</p>
        <label className="field">
          <span className="field-label">Voz</span>
          <select
            className={`input ${s.select}`}
            value={cfg.value.voice_uri ?? ''}
            onChange={(e) => void save({ voice_uri: e.target.value || null })}
          >
            <option value="">Automática</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </label>
      </Card>

      <Card title="Inteligencia artificial">
        {status.data ? (
          <>
            <p className={s.muted}>
              Modelo {status.data.model} · {status.data.used}/{status.data.limit} peticiones hoy
            </p>
            {status.data.providers.length > 1 && (
              <SegmentedControl
                label="Proveedor de IA"
                options={status.data.providers.map((p) => ({ value: p, label: p === 'gemini' ? 'Gemini' : 'Claude' }))}
                value={cfg.value.ai_provider ?? status.data.provider}
                onChange={(v) => void save({ ai_provider: v })}
              />
            )}
            {status.data.providers.length === 0 && <p className={s.muted}>No hay claves de IA configuradas en los secrets de Supabase.</p>}
          </>
        ) : (
          <p className={s.muted}>{status.isLoading ? 'Comprobando…' : 'No se ha podido consultar la función de IA (¿sin desplegar?).'}</p>
        )}
        <button type="button" className="btn" onClick={runTest} disabled={testing}>
          {testing ? 'Probando…' : 'Probar IA'}
        </button>
      </Card>

      <Card title="Perfil">
        <button type="button" className="btn" onClick={() => setEditing(true)}>
          Editar mis respuestas
        </button>
      </Card>

      <Card title="Progreso">
        <button type="button" className={`btn ${s.danger}`} onClick={doReset} disabled={reset.isPending}>
          Reiniciar progreso
        </button>
        {cfg.value.daily_goal !== ENGLISH_DEFAULTS.daily_goal && (
          <button type="button" className="btn btn-plain" onClick={() => void save({ daily_goal: null })}>
            Objetivo automático
          </button>
        )}
      </Card>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Mis respuestas">
        {editing && <ProfileForm initial={current} onDone={() => setEditing(false)} />}
      </Sheet>
    </>
  )
}
