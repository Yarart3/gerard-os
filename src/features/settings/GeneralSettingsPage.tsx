import { useState, type FormEvent } from 'react'
import { Card, ListRow, PageHeader, Pill, SegmentedControl, useToast } from '../../components/ui'
import { Download } from '../../components/ui/icons'
import { formatNumber, parseDecimal } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
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

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const profile: GeneralSettings['profile'] = {
      name: name.trim(),
      weight_kg: parseDecimal(weight),
      height_cm: parseDecimal(height),
      birth_date: birth || null,
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
      <label className={`field ${s.full}`}>
        <span className="field-label">Fecha de nacimiento</span>
        <input className="input" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} />
      </label>
      <div className={s.actions}>
        <button className="btn" style={{ color: 'var(--accent)' }} disabled={settings.saving}>
          Guardar
        </button>
      </div>
    </form>
  )
}

export function GeneralSettingsPage() {
  const settings = useGeneralSettings()
  const { session } = useAuth()
  const toast = useToast()
  const [exporting, setExporting] = useState(false)

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

  return (
    <div className={page.page}>
      <PageHeader title="Ajustes" date={null} />
      <div className={page.grid}>
        <Card title="Apariencia">
          <SegmentedControl label="Tema" options={THEMES} value={settings.value.theme} onChange={setTheme} />
        </Card>
        <Card title="Perfil">
          {settings.isLoading ? (
            <p className={s.muted}>Cargando…</p>
          ) : (
            <ProfileForm key={JSON.stringify(settings.value.profile)} settings={settings} />
          )}
        </Card>
        <Card title="Datos" flush>
          <ListRow
            icon={<Download size={20} />}
            title="Exportar todo (JSON)"
            onClick={exporting ? undefined : exportAll}
            value={exporting ? 'Exportando…' : undefined}
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
            onClick={() => supabase.auth.signOut()}
          />
        </Card>
      </div>
    </div>
  )
}
