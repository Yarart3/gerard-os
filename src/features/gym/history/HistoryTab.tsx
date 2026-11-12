import { useMemo, useState } from 'react'
import { Card, EmptyState, ListRow, SegmentedControl, Sheet, useToast } from '../../../components/ui'
import {
  addDays,
  formatDayMonth,
  formatLongDate,
  formatShortDate,
  weekStart,
} from '../../../lib/dates'
import { formatKcal, formatNumber } from '../../../lib/format'
import { useDeleteWorkout, useExercises, useWorkoutHistory, type HistoryWorkout } from '../api'
import { useGymSettings } from '../gymSettings'
import { formatMetric, formatSet, formatVolume } from '../logic/display'
import { personalRecords, progression, weeklySummary, workoutKcal, workoutVolume } from '../logic/stats'
import { isExerciseUnit, type ExerciseUnit } from '../logic/types'
import { BarsChart, LineSeries } from './Charts'
import s from '../Gym.module.css'
import { useToday } from '../../../lib/useToday'

type Metric = 'volume' | 'kcal' | 'sessions'
const METRICS = [
  { value: 'volume', label: 'Volumen' },
  { value: 'kcal', label: 'Kcal' },
  { value: 'sessions', label: 'Sesiones' },
] as const

export function HistoryTab() {
  const { data: history = [], isLoading } = useWorkoutHistory()
  const { data: catalog = [] } = useExercises()
  const { value: cfg } = useGymSettings()
  const wu = cfg.weight_unit
  const [metric, setMetric] = useState<Metric>('volume')
  const [detail, setDetail] = useState<HistoryWorkout | null>(null)
  const [chosen, setChosen] = useState<string>('')

  const exById = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog])
  const unitOf = (id: string): ExerciseUnit | undefined => {
    const u = exById.get(id)?.unit
    return u && isExerciseUnit(u) ? u : undefined
  }
  const sessions = history.filter((w) => w.items.length || w.duration_min)
  const weeks = weeklySummary(sessions)
  const prs = personalRecords(sessions, unitOf)
  const trained = [...prs.keys()]
    .map((id) => exById.get(id))
    .filter((e) => e !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const exerciseId = chosen || trained[0]?.id || ''
  const exUnit = unitOf(exerciseId) ?? 'kg'

  const today = useToday()

  if (isLoading) return <p className={s.muted}>Cargando…</p>
  if (!sessions.length)
    return (
      <Card>
        <EmptyState
          title="Sin historial"
          text="Tus sesiones aparecerán aquí cuando registres el primer entreno."
        />
      </Card>
    )

  // Últimas 8 semanas (incluida la actual), también las que no tienen sesiones.
  const thisWeek = weekStart(today)
  const byWeek = new Map(weeks.map((w) => [w.week, w]))
  const last8 = Array.from({ length: 8 }, (_, i) => addDays(thisWeek, (i - 7) * 7)).map((week) => {
    const w = byWeek.get(week) ?? { week, sessions: 0, volume: 0, kcal: 0 }
    const value =
      metric === 'volume' ? Math.round(w.volume) : metric === 'kcal' ? Math.round(w.kcal) : w.sessions
    const tip =
      metric === 'volume'
        ? formatVolume(w.volume, wu)
        : metric === 'kcal'
          ? formatKcal(w.kcal)
          : `${w.sessions} sesiones`
    return { label: formatDayMonth(week), value, tip, sub: `Semana del ${formatDayMonth(week)}` }
  })
  const current = byWeek.get(thisWeek) ?? { sessions: 0, volume: 0, kcal: 0 }
  const prev = byWeek.get(addDays(thisWeek, -7)) ?? { sessions: 0, volume: 0, kcal: 0 }

  const points = exerciseId
    ? progression(sessions, exerciseId, exUnit).map((p) => ({
        label: formatDayMonth(p.date),
        value: exUnit === 'kg' ? Math.round(p.value * 10) / 10 : p.value,
        tip: formatMetric(exUnit, p.value, wu),
        sub: formatShortDate(p.date) + (p.e1rm ? ` · 1RM est. ${formatMetric('kg', p.e1rm, wu)}` : ''),
      }))
    : []

  return (
    <div className={s.stack}>
      <Card title="Resumen semanal">
        <div className={s.summary}>
          <div className={s.stat}>
            <span className={s.statValue}>{current.sessions}</span>
            <span className={s.statLabel}>Sesiones (ant. {prev.sessions})</span>
          </div>
          <div className={s.stat}>
            <span className={s.statValue}>{formatVolume(current.volume, wu)}</span>
            <span className={s.statLabel}>Volumen (ant. {formatVolume(prev.volume, wu)})</span>
          </div>
          <div className={s.stat}>
            <span className={s.statValue}>{formatKcal(current.kcal)}</span>
            <span className={s.statLabel}>Kcal (ant. {formatKcal(prev.kcal)})</span>
          </div>
        </div>
        <SegmentedControl label="Dato de la gráfica" options={METRICS} value={metric} onChange={setMetric} />
        <BarsChart
          data={last8}
          label={`${METRICS.find((m) => m.value === metric)?.label} de las últimas 8 semanas`}
        />
      </Card>

      {trained.length > 0 && (
        <Card title="Progresión">
          <label className="field">
            <span className="visually-hidden">Ejercicio</span>
            <select
              className={`input ${s.select}`}
              value={exerciseId}
              onChange={(e) => setChosen(e.target.value)}
            >
              {trained.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          {points.length > 1 ? (
            <LineSeries data={points} label={`Progresión de ${exById.get(exerciseId)?.name ?? ''}`} />
          ) : (
            <p className={s.muted} style={{ marginTop: 12 }}>
              Hace falta más de una sesión con series hechas para ver la gráfica.
            </p>
          )}
        </Card>
      )}

      <Card title="Récords personales" flush>
        {trained.length ? (
          trained.map((e) => {
            const pr = prs.get(e.id)!
            const unit = unitOf(e.id) ?? 'reps'
            return (
              <ListRow
                key={e.id}
                title={e.name}
                subtitle={
                  formatShortDate(pr.date) +
                  (pr.e1rm && pr.reps && pr.reps > 1 ? ` · 1RM est. ${formatMetric('kg', pr.e1rm, wu)}` : '')
                }
                value={
                  unit === 'kg' && pr.reps
                    ? `${formatMetric('kg', pr.value, wu)} × ${pr.reps}`
                    : formatMetric(unit, pr.value, wu)
                }
              />
            )
          })
        ) : (
          <p className={s.muted} style={{ padding: '0 16px 16px' }}>
            Marca series como hechas para registrar récords.
          </p>
        )}
      </Card>

      <Card title="Sesiones" flush>
        {sessions.slice(0, 60).map((w) => (
          <ListRow
            key={w.id}
            title={formatLongDate(w.date)}
            subtitle={[
              `${w.items.length} ejercicios`,
              workoutVolume(w) ? formatVolume(workoutVolume(w), wu) : null,
              w.duration_min ? `${w.duration_min} min` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
            value={workoutKcal(w) ? formatKcal(workoutKcal(w)) : undefined}
            onClick={() => setDetail(w)}
          />
        ))}
      </Card>

      <SessionSheet workout={detail} onClose={() => setDetail(null)} exById={exById} />
    </div>
  )
}

function SessionSheet({
  workout,
  onClose,
  exById,
}: {
  workout: HistoryWorkout | null
  onClose: () => void
  exById: ReadonlyMap<string, { name: string; unit: string }>
}) {
  const { value: cfg } = useGymSettings()
  const del = useDeleteWorkout()
  const toast = useToast()
  if (!workout) return null
  return (
    <Sheet open onClose={onClose} title={formatLongDate(workout.date)}>
      <Card>
        <div className={s.summary} style={{ margin: 0 }}>
          <div className={s.stat}>
            <span className={s.statValue}>{workout.duration_min ?? '—'}</span>
            <span className={s.statLabel}>Minutos</span>
          </div>
          <div className={s.stat}>
            <span className={s.statValue}>{workout.met_kcal ? formatNumber(workout.met_kcal, 0) : '—'}</span>
            <span className={s.statLabel}>Kcal MET</span>
          </div>
          <div className={s.stat}>
            <span className={s.statValue}>
              {workout.watch_kcal ? formatNumber(workout.watch_kcal, 0) : '—'}
            </span>
            <span className={s.statLabel}>Kcal reloj</span>
          </div>
        </div>
      </Card>
      {workout.items.map((it) => {
        const ex = exById.get(it.exercise_id)
        const unit = ex && isExerciseUnit(ex.unit) ? ex.unit : 'reps'
        return (
          <Card key={it.id} title={ex?.name ?? 'Ejercicio'}>
            {it.sets.map((set, i) => (
              <div key={i} className={s.detailSet}>
                <span className={s.small}>Serie {i + 1}</span>
                <span style={{ color: set.done ? undefined : 'var(--muted)' }}>
                  {formatSet(unit, set, cfg.weight_unit)}
                  {set.done ? '' : ' (sin hacer)'}
                </span>
              </div>
            ))}
          </Card>
        )
      })}
      {workout.notes && (
        <Card title="Notas">
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{workout.notes}</p>
        </Card>
      )}
      <button
        type="button"
        className="btn"
        style={{ color: 'var(--danger)' }}
        onClick={async () => {
          if (!confirm('¿Borrar esta sesión y todas sus series?')) return
          try {
            await del.mutateAsync(workout.id)
            onClose()
            toast('Sesión borrada')
          } catch {
            toast('No se ha podido borrar', 'error')
          }
        }}
      >
        Borrar sesión
      </button>
    </Sheet>
  )
}
