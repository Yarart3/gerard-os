import { useNavigate } from 'react-router-dom'
import { Card, EmptyState, ListRow, ProgressBar } from '../../../components/ui'
import { formatWeekdayShort } from '../../../lib/dates'
import { useDaily, useProfile, useRecentErrors, useVocab } from '../api'
import { goalFor, useEnglishSettings } from '../englishSettings'
import { currentStreak, lastSevenDays } from '../logic/daily'
import { isDue } from '../logic/leitner'
import s from '../English.module.css'
import { useToday } from '../../../lib/useToday'

export function TodayTab() {
  const navigate = useNavigate()
  const daily = useDaily()
  const profile = useProfile()
  const cfg = useEnglishSettings()
  const vocab = useVocab()
  const errors = useRecentErrors()
  const today = useToday()
  const rows = daily.data ?? []
  const goal = goalFor(cfg.value.daily_goal, profile.data?.answers.minutes ?? 20)
  const points = rows.find((r) => r.date === today)?.points ?? 0
  const week = lastSevenDays(rows, today)
  const max = Math.max(goal, ...week.map((d) => d.points))
  const due = (vocab.data ?? []).filter((c) => isDue(c, today)).length
  const go = (sub: string) => navigate(`/ingles/${sub}`)

  return (
    <div className={s.stack}>
      <div className={s.grid2}>
        <Card title="Racha y puntos">
          <div className={s.statRow}>
            <div>
              <div className={s.bigNum}>{currentStreak(rows, today)}</div>
              <div className={s.small}>días de racha</div>
            </div>
            <div>
              <div className={s.bigNum}>
                {points}
                <span className={s.small}> / {goal}</span>
              </div>
              <div className={s.small}>puntos hoy</div>
            </div>
          </div>
          <ProgressBar value={Math.min(1, points / goal)} label="Puntos de hoy frente al objetivo" />
        </Card>

        <Card title="Últimos 7 días">
          <div className={s.week} role="img" aria-label={`Puntos de la semana: ${week.map((d) => d.points).join(', ')}`}>
            {week.map((d) => (
              <div key={d.date} className={s.weekCol}>
                <div className={s.weekTrack}>
                  <div className={`${s.weekBar} ${d.points >= goal ? s.weekDone : ''}`} style={{ height: `${Math.max(4, (d.points / max) * 100)}%` }} />
                </div>
                <span className={s.small}>{formatWeekdayShort(d.date).slice(0, 1).toUpperCase()}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Tareas de hoy" flush>
        <ListRow title="Repasar vocabulario" value={due ? `${due} tarjetas` : 'Al día'} onClick={() => go('vocabulario')} />
        <ListRow title="Un dictado" value="Oído" onClick={() => go('oido')} />
        <ListRow title="Ordenar una frase" value="Orden de palabras" onClick={() => go('orden')} />
        <ListRow title="Reformular una frase" value="Reformular" onClick={() => go('reformular')} />
      </Card>

      <Card title="Errores recientes">
        {(errors.data ?? []).length === 0 ? (
          <EmptyState title="Sin errores recientes" text="Los fallos de tus ejercicios aparecerán aquí para repasarlos." />
        ) : (
          <ul className={s.list}>
            {(errors.data ?? []).map((e) => (
              <li key={e.id} className={s.errorItem}>
                <strong>{e.answer}</strong>
                {e.rule && <span className={s.small}> · {e.rule}</span>}
                {e.feedback && <div className={s.small}>{e.feedback}</div>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
