import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Card,
  ChipScroller,
  ListRow,
  NeedsConnection,
  PageHeader,
  Pill,
  SearchInput,
  SegmentedControl,
  useToast,
} from '../../components/ui'
import { Download } from '../../components/ui/icons'
import type { SettingsId } from '../../layout/sections'
import { formatNumber, parseDecimal } from '../../lib/format'
import { useOnline } from '../../lib/offline/connectivity'
import { countUnsynced, unsyncedWarning } from '../../lib/offline/pending'
import { supabase } from '../../lib/supabase'
import AgendaSettingsPanel from '../agenda/AgendaSettingsPanel'
import { useAuth } from '../auth/AuthProvider'
import EnglishSettingsPanel from '../english/EnglishSettingsPanel'
import GymSettingsPanel, { NutritionSettingsPanel } from '../gym/GymSettingsPanel'
import { normalize } from '../gym/logic/wodMatch'
import PersonalSettingsPanel from '../personal/PersonalSettingsPanel'
import TodaySettingsPanel from '../today/TodaySettingsPanel'
import { collectExport, downloadJson } from './exportData'
import type { ThemePref } from './theme'
import { useGeneralSettings, type GeneralSettings } from './useSettings'
import page from '../../layout/Page.module.css'
import s from './Settings.module.css'

const THEMES = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Automático' },
] as const

const toText = (n: number | null) => (n === null ? '' : formatNumber(n, 2).replace(/\./g, ''))

function ProfileForm({ settings }: { settings: ReturnType<typeof useGeneralSettings> }) {
  const toast = useToast()
  const p = settings.value.profile
  const [name, setName] = useState(p.name)
  const [weight, setWeight] = useState(toText(p.weight_kg))
  const [height, setHeight] = useState(toText(p.height_cm))
  const [birth, setBirth] = useState(p.birth_date ?? '')
  const [sex, setSex] = useState<'male' | 'female' | ''>(p.sex ?? '')
  const online = useOnline()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const profile: GeneralSettings['profile'] = {
      name: name.trim(),
      weight_kg: parseDecimal(weight),
      height_cm: parseDecimal(height),
      birth_date: birth || null,
      sex: sex || null,
    }
    try {
      await settings.save({ ...settings.value, profile })
      toast('Perfil guardado')
    } catch {
      toast('No se ha podido guardar', 'error')
    }
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <label className={`field ${s.full}`}>
        <span className="field-label">Nombre</span>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="given-name"
        />
      </label>
      <label className="field">
        <span className="field-label">Peso (kg)</span>
        <input
          className="input"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="0,0"
        />
      </label>
      <label className="field">
        <span className="field-label">Altura (cm)</span>
        <input
          className="input"
          inputMode="decimal"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          placeholder="0"
        />
      </label>
      <label className="field">
        <span className="field-label">Fecha de nacimiento</span>
        <input className="input" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">Sexo (para calorías)</span>
        <select
          className="input"
          value={sex}
          onChange={(e) => setSex(e.target.value === 'male' || e.target.value === 'female' ? e.target.value : '')}
        >
          <option value="">Sin indicar</option>
          <option value="male">Hombre</option>
          <option value="female">Mujer</option>
        </select>
      </label>
      <div className={s.actions}>
        <NeedsConnection />
        <button className="btn" style={{ color: 'var(--accent)' }} disabled={settings.saving || !online}>
          Guardar
        </button>
      </div>
    </form>
  )
}

type Group = { id: SettingsId; title: string; keywords: string; render: () => ReactNode }

/**
 * Página única de Ajustes: todos los apartados seguidos, con índice para saltar y buscador.
 * `#/ajustes?s=<apartado>` (enlaces «Ajustar» de cada pantalla) abre directamente ese apartado.
 */
export default function SettingsPage() {
  const settings = useGeneralSettings()
  const { session } = useAuth()
  const toast = useToast()
  const [exporting, setExporting] = useState(false)
  const online = useOnline()
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const [q, setQ] = useState('')
  const target = params.get('s') as SettingsId | null
  const [current, setCurrent] = useState<SettingsId>(target ?? 'perfil')
  const scrolled = useRef(false)

  const signOut = () => {
    const n = countUnsynced(qc)
    if (n > 0 && !confirm(unsyncedWarning(n))) return
    void supabase.auth.signOut()
  }

  const setTheme = (theme: ThemePref) => {
    settings.save({ ...settings.value, theme }).catch(() => toast('No se ha podido guardar', 'error'))
  }

  const exportAll = async () => {
    setExporting(true)
    try {
      const data = await collectExport(async (table, from, to) => {
        const { data, error } = await supabase.from(table).select('*').order('created_at').range(from, to)
        if (error) throw error
        return data
      })
      downloadJson(data, `gerard-os-${data.exported_at.slice(0, 10)}.json`)
      toast('Exportación lista')
    } catch {
      toast('No se ha podido exportar', 'error')
    } finally {
      setExporting(false)
    }
  }

  const groups: Group[] = [
    {
      id: 'perfil',
      title: 'Perfil',
      keywords: 'nombre peso altura nacimiento edad sexo',
      render: () => (
        <Card>
          {settings.isLoading ? (
            <p className={s.muted}>Cargando…</p>
          ) : (
            <ProfileForm key={JSON.stringify(settings.value.profile)} settings={settings} />
          )}
        </Card>
      ),
    },
    {
      id: 'apariencia',
      title: 'Apariencia',
      keywords: 'tema oscuro claro automatico modo noche',
      render: () => (
        <Card>
          <SegmentedControl label="Tema" options={THEMES} value={settings.value.theme} onChange={setTheme} />
        </Card>
      ),
    },
    {
      id: 'hoy',
      title: 'Hoy',
      keywords: 'tarjetas orden visibles hora de corte dia',
      render: () => <TodaySettingsPanel />,
    },
    {
      id: 'entreno',
      title: 'Entreno',
      keywords:
        'gym unidades kg lb incremento descanso met calorias peso corporal grupos musculares apple salud watch atajo',
      render: () => <GymSettingsPanel />,
    },
    {
      id: 'comida',
      title: 'Comida',
      keywords: 'nutricion objetivo kcal proteina carbohidratos grasa fibra macros comidas desayuno cena',
      render: () => <NutritionSettingsPanel />,
    },
    {
      id: 'agenda',
      title: 'Agenda',
      keywords: 'icloud calendario calendarios colores semana uni asignaturas notas avisos entregas sincronizar',
      render: () => <AgendaSettingsPanel />,
    },
    {
      id: 'ingles',
      title: 'Inglés',
      keywords: 'ingles nivel objetivo voz acento velocidad ia gemini anthropic proveedor probar reiniciar',
      render: () => <EnglishSettingsPanel />,
    },
    {
      id: 'personal',
      title: 'Personal',
      keywords: 'gastos categorias presupuesto watchlist plataformas notas etiquetas',
      render: () => <PersonalSettingsPanel />,
    },
    {
      id: 'datos',
      title: 'Datos y cuenta',
      keywords: 'exportar importar json csv copia almacenamiento cuenta sesion cerrar email',
      render: () => (
        <>
          <Card title="Datos" flush>
            <ListRow
              icon={<Download size={20} />}
              title="Exportar todo (JSON)"
              onClick={exporting || !online ? undefined : exportAll}
              value={exporting ? 'Exportando…' : !online ? 'Necesita conexión' : undefined}
            />
            <ListRow title="Exportar CSV" value={<Pill>Próximamente</Pill>} />
            <ListRow title="Importar" value={<Pill>Próximamente</Pill>} />
            <ListRow title="Uso de almacenamiento" value={<Pill>Próximamente</Pill>} />
          </Card>
          <Card title="Cuenta" flush>
            <ListRow title="Sesión iniciada" subtitle={session?.user.email} />
            <ListRow
              title={<span style={{ color: 'var(--danger)' }}>Cerrar sesión</span>}
              chevron={false}
              onClick={signOut}
            />
          </Card>
        </>
      ),
    },
  ]

  const nq = normalize(q)
  const visible = nq ? groups.filter((g) => normalize(`${g.title} ${g.keywords}`).includes(nq)) : groups

  const jump = (id: SettingsId) => {
    setCurrent(id)
    document.getElementById(`ajustes-${id}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  // Enlace «Ajustar»: salta al apartado (y otra vez cuando terminan de cargar los de arriba).
  useEffect(() => {
    if (!target || scrolled.current) return
    scrolled.current = true
    const go = () => document.getElementById(`ajustes-${target}`)?.scrollIntoView?.({ block: 'start' })
    const a = window.setTimeout(go, 50)
    const b = window.setTimeout(go, 700)
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
    }
  }, [target])

  return (
    <div className={`${page.page} ${s.page}`}>
      <PageHeader title="Ajustes" date={null} />
      <div className={s.top}>
        <SearchInput value={q} onChange={setQ} label="Buscar ajuste" placeholder="Buscar ajuste" />
        {!nq && (
          <ChipScroller
            label="Apartados de Ajustes"
            options={groups.map((g) => ({ value: g.id, label: g.title }))}
            value={current}
            onChange={jump}
          />
        )}
      </div>
      {visible.map((g) => (
        <section key={g.id} id={`ajustes-${g.id}`} className={s.group} aria-labelledby={`ajustes-h-${g.id}`}>
          <h2 id={`ajustes-h-${g.id}`} className={s.groupTitle}>
            {g.title}
          </h2>
          {g.render()}
        </section>
      ))}
      {!visible.length && <p className={s.muted}>Ningún ajuste coincide con «{q}».</p>}
    </div>
  )
}
