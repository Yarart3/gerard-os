import { useState } from 'react'
import { Card, ListRow, NeedsConnection, NumberInput, SegmentedControl, useToast } from '../../components/ui'
import { useOnline } from '../../lib/offline/connectivity'
import { Check } from '../../components/ui/icons'
import { formatAgo } from './format'
import {
  useCaldavAction,
  useCalendars,
  useCaldavSync,
  useSubjects,
  useSyncStatus,
  useUpdateCalendar,
  type Subject,
} from './api'
import { useAgendaSettings } from './agendaSettings'
import type { FirstDay } from './logic/grid'
import { SubjectSheet } from './uni/SubjectSheet'
import s from './Agenda.module.css'

const FIRST_DAY = [
  { value: '1', label: 'Lunes' },
  { value: '7', label: 'Domingo' },
] as const

/** Ajustes de Agenda (CLAUDE.md §8) en la página única de Ajustes. */
export default function AgendaSettingsPanel() {
  const toast = useToast()
  const cfg = useAgendaSettings()
  const calendars = useCalendars()
  const status = useSyncStatus()
  const test = useCaldavAction('test')
  const discover = useCaldavAction('discover')
  const sync = useCaldavSync()
  const update = useUpdateCalendar()
  const subjects = useSubjects()
  const [subject, setSubject] = useState<Subject | 'new' | null>(null)
  const [conn, setConn] = useState<{ ok: boolean; text: string } | null>(null)

  const run = async (kind: 'test' | 'discover' | 'sync') => {
    try {
      if (kind === 'test') {
        const r = await test.mutateAsync()
        setConn({ ok: r.ok, text: r.ok ? 'Conexión con iCloud correcta' : 'iCloud no ha devuelto tu cuenta' })
      } else if (kind === 'discover') {
        const r = await discover.mutateAsync()
        setConn({ ok: true, text: `${r.calendars ?? 0} calendarios encontrados (${r.added ?? 0} nuevos)` })
        await sync.mutateAsync({ force: true }).catch(() => {})
      } else {
        await sync.mutateAsync({ force: true })
        toast('Sincronizado')
      }
    } catch (e) {
      setConn({ ok: false, text: e instanceof Error ? e.message : 'Error de conexión' })
    }
  }

  const last = status.data?.lastSyncedAt
  const cals = calendars.data ?? []
  const online = useOnline()
  const busy = !online || test.isPending || discover.isPending || sync.isPending
  const save = (patch: Parameters<typeof cfg.save>[0]) =>
    cfg.save(patch).catch(() => toast('No se han podido guardar los ajustes', 'error'))

  return (
    <>
      <Card title="iCloud">
        <p className={s.muted} style={{ marginBottom: 8 }}>
          {status.data?.lastError
            ? `Último error: ${status.data.lastError}`
            : last
              ? `Sincronizado ${formatAgo(last)}. Se actualiza solo cada 15 min.`
              : 'Aún no se ha sincronizado.'}
        </p>
        {conn && (
          <p role="status" className={s.muted} style={{ color: conn.ok ? 'var(--green)' : 'var(--danger)', marginBottom: 8 }}>
            {conn.text}
          </p>
        )}
        <p className={s.small} style={{ margin: '0 0 12px' }}>
          Las credenciales se guardan en los secrets de Supabase, nunca en la web.
        </p>
        <div className={s.stack} style={{ gap: 8 }}>
          <button type="button" className="btn" onClick={() => run('test')} disabled={busy}>
            {test.isPending ? 'Probando…' : 'Probar conexión'}
          </button>
          <button type="button" className="btn" onClick={() => run('discover')} disabled={busy}>
            {discover.isPending ? 'Buscando…' : 'Descubrir calendarios'}
          </button>
          <button type="button" className="btn" onClick={() => run('sync')} disabled={busy}>
            {sync.isPending ? 'Sincronizando…' : 'Sincronizar ahora'}
          </button>
        </div>
        <NeedsConnection />
      </Card>

      <Card title="Calendarios" flush>
        {cals.length === 0 ? (
          <p className={s.empty}>Pulsa «Descubrir calendarios» para traer los de iCloud.</p>
        ) : (
          cals.map((c) => (
            <div key={c.id} className={s.evRow} style={{ alignItems: 'center' }}>
              <input
                type="color"
                className={s.colorInput}
                aria-label={`Color de ${c.name}`}
                value={c.color && /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : '#0071e3'}
                onChange={(e) => update.mutate({ id: c.id, color: e.target.value.toUpperCase() })}
              />
              <span className={s.evText}>
                <span className={s.evTitle}>{c.name}</span>
                <span className={s.evMeta}>{c.is_default ? 'Predeterminado' : ''}</span>
              </span>
              {!c.is_default && (
                <button type="button" className="btn btn-plain" onClick={() => update.mutate({ id: c.id, is_default: true })} aria-label={`Usar ${c.name} como predeterminado`}>
                  <Check size={16} /> Predet.
                </button>
              )}
              <input
                type="checkbox"
                className={s.checkbox}
                checked={c.visible}
                aria-label={`Mostrar ${c.name}`}
                onChange={(e) => update.mutate({ id: c.id, visible: e.target.checked })}
              />
            </div>
          ))
        )}
      </Card>

      <Card title="Calendario">
        <div className={s.form}>
          <div className={`field ${s.full}`}>
            <span className="field-label">La semana empieza en</span>
            <SegmentedControl
              label="Primer día de la semana"
              options={FIRST_DAY}
              value={String(cfg.value.first_day) as '1' | '7'}
              onChange={(v) => save({ ...cfg.value, first_day: Number(v) as FirstDay })}
            />
          </div>
          <label className={`${s.checkRow} ${s.full}`}>
            <input
              type="checkbox"
              className={s.checkbox}
              checked={cfg.value.show_deadlines}
              onChange={(e) => save({ ...cfg.value, show_deadlines: e.target.checked })}
            />
            Mostrar entregas y exámenes en el calendario
          </label>
        </div>
      </Card>

      <Card title="Uni">
        <label className="field">
          <span className="field-label">Avisar de una entrega desde (días antes)</span>
          <NumberInput
            decimals={0}
            value={cfg.value.deadline_alert_days}
            onCommit={(n) => save({ ...cfg.value, deadline_alert_days: n !== null && n >= 0 ? Math.round(n) : 3 })}
          />
        </label>
        <p className={s.small} style={{ margin: '8px 0 0' }}>
          Sistema de notas: 0–10, media ponderada por ECTS.
        </p>
      </Card>

      <Card title="Asignaturas" flush>
        {(subjects.data ?? []).map((x) => (
          <ListRow
            key={x.id}
            icon={<span className={s.dot} style={{ background: x.color ?? 'var(--muted)' }} />}
            title={x.name}
            onClick={() => setSubject(x)}
          />
        ))}
        <ListRow title="Añadir asignatura" onClick={() => setSubject('new')} />
      </Card>
      <SubjectSheet subject={subject} onClose={() => setSubject(null)} />
    </>
  )
}
