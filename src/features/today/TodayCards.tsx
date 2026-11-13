import { useState, type CSSProperties, type FormEvent } from 'react'
import { Card, ListRow, Pill, ProgressBar, useToast } from '../../components/ui'
import { formatDayMonth } from '../../lib/dates'
import { formatEuros, formatKcal, formatNumber } from '../../lib/format'
import { useToday } from '../../lib/useToday'
import { useAgendaSettings } from '../agenda/agendaSettings'
import { useDeadlines, useSubjects } from '../agenda/api'
import { eventTimeLabel } from '../agenda/format'
import { countdown } from '../agenda/logic/uni'
import { useDayEvents } from '../agenda/useDayEvents'
import { useDaily, useProfile, useVocab } from '../english/api'
import { goalFor, useEnglishSettings } from '../english/englishSettings'
import { currentStreak } from '../english/logic/daily'
import { isDue } from '../english/logic/leitner'
import { useActiveWorkout, useDayWorkouts, useExercises } from '../gym/api'
import { useGymSettings } from '../gym/gymSettings'
import { mealItemMacros, sumMacros } from '../nutrition/logic/macros'
import { useMeals, useNutritionMaps } from '../nutrition/api'
import { usePersonalSummary, useSaveNote } from '../personal/api'
import { upcomingDeadlines } from './logic/upcoming'
import type { CardId } from './logic/cards'
import s from './Today.module.css'

function KcalCard({ today }: { today: string }) {
  const { value: cfg } = useGymSettings()
  const meals = useMeals(today, today)
  const maps = useNutritionMaps()
  const day = useDayWorkouts(today)
  const eaten = sumMacros(
    (meals.data ?? []).flatMap((m) => m.meal_items.map((it) => mealItemMacros(it, maps.foodMap, maps.recipeMap))),
  ).kcal
  const target = cfg.nutrition.kcal
  // Suma de los entrenos terminados del día (puede haber varios).
  const sum = (k: 'watch_kcal' | 'met_kcal') => {
    const vals = day.data.map((w) => w[k]).filter((v): v is number => v !== null)
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null
  }
  const watch = sum('watch_kcal')
  const met = sum('met_kcal')
  return (
    <Card title="Calorías">
      <div className={s.head}>
        <span className={s.big}>
          {formatNumber(Math.round(eaten), 0)}
          <span className={s.unit}> / {formatNumber(target, 0)} kcal</span>
        </span>
        <span className={s.small}>comidas</span>
      </div>
      <ProgressBar
        value={target ? eaten / target : 0}
        label="Kcal de las comidas frente al objetivo"
        tone={eaten > target ? 'orange' : 'accent'}
      />
      <div className={s.split}>
        <div className={s.stat}>
          <span className={s.statValue}>{watch !== null ? formatKcal(watch) : '—'}</span>
          <span className={s.small}>Quemadas · Apple Watch</span>
        </div>
        <div className={s.stat}>
          <span className={s.statValue}>{met !== null ? formatKcal(met) : '—'}</span>
          <span className={s.small}>Quemadas · estimación MET</span>
        </div>
      </div>
    </Card>
  )
}

function AgendaCard({ today }: { today: string }) {
  const { events, isLoading } = useDayEvents(today)
  return (
    <Card title="Agenda de hoy" flush>
      {events.length ? (
        events.map((ev) => (
          <ListRow
            key={ev.key}
            to={ev.kind === 'deadline' ? '/agenda/uni' : '/agenda'}
            icon={<span className={s.dot} style={{ background: ev.color } as CSSProperties} aria-hidden="true" />}
            title={ev.title}
            subtitle={[eventTimeLabel(ev), ev.location].filter(Boolean).join(' · ')}
          />
        ))
      ) : (
        <p className={s.empty}>{isLoading ? 'Cargando…' : 'Sin eventos hoy'}</p>
      )}
    </Card>
  )
}

function DeadlinesCard({ today }: { today: string }) {
  const { value: cfg } = useAgendaSettings()
  const deadlines = useDeadlines()
  const subjects = useSubjects()
  const subjectName = new Map((subjects.data ?? []).map((x) => [x.id, x.name]))
  const list = upcomingDeadlines(deadlines.data ?? [], today)
  return (
    <Card title="Próximas entregas" flush>
      {list.length ? (
        list.map((d) => {
          const c = countdown(d.due_at, today, { alertDays: cfg.deadline_alert_days })
          return (
            <ListRow
              key={d.id}
              to="/agenda/uni"
              title={d.title}
              subtitle={[d.subject_id ? subjectName.get(d.subject_id) : null, formatDayMonth(d.due_at.slice(0, 10))]
                .filter(Boolean)
                .join(' · ')}
              value={<Pill tone={c.tone}>{c.label}</Pill>}
            />
          )
        })
      ) : (
        <p className={s.empty}>{deadlines.isLoading ? 'Cargando…' : 'Nada pendiente'}</p>
      )}
    </Card>
  )
}

function WorkoutCard({ today }: { today: string }) {
  const active = useActiveWorkout()
  const day = useDayWorkouts(today)
  const exercises = useExercises()
  const names = new Map((exercises.data ?? []).map((e) => [e.id, e.name]))
  const live = active.data
  const done = day.data
  const exList = (ids: string[]) =>
    ids
      .slice(0, 3)
      .map((id) => names.get(id) ?? '—')
      .join(' · ')
  return (
    <Card title="Entreno de hoy" flush>
      {live && (
        <ListRow
          to="/gym"
          title={`En curso: ${live.title ?? 'Entreno'}`}
          subtitle={
            live.workout_items.length
              ? exList(live.workout_items.map((i) => i.exercise_id))
              : 'Sin ejercicios todavía'
          }
        />
      )}
      {done.map((w) => (
        <ListRow
          key={w.id}
          to="/gym"
          title={w.title ?? 'Entreno'}
          subtitle={exList(w.items.map((i) => i.exercise_id)) || undefined}
          value={w.duration_min ? `${w.duration_min} min` : undefined}
        />
      ))}
      {!live && !done.length && (
        <ListRow
          to="/gym"
          title={active.isLoading || day.isLoading ? 'Cargando…' : 'Sin entreno hoy'}
          subtitle="Empezar un entreno"
        />
      )}
    </Card>
  )
}

function EnglishCard({ today }: { today: string }) {
  const daily = useDaily()
  const profile = useProfile()
  const cfg = useEnglishSettings()
  const vocab = useVocab()
  const rows = daily.data ?? []
  const goal = goalFor(cfg.value.daily_goal, profile.data?.answers.minutes ?? 20)
  const points = rows.find((r) => r.date === today)?.points ?? 0
  const due = (vocab.data ?? []).filter((c) => isDue(c, today)).length
  return (
    <Card title="Inglés">
      <div className={s.stats}>
        <div>
          <div className={s.big}>{currentStreak(rows, today)}</div>
          <div className={s.small}>días de racha</div>
        </div>
        <div>
          <div className={s.big}>
            {points}
            <span className={s.unit}> / {goal}</span>
          </div>
          <div className={s.small}>puntos hoy</div>
        </div>
      </div>
      <ProgressBar value={Math.min(1, points / goal)} label="Puntos de hoy frente al objetivo" tone="green" />
      <div className={s.inner}>
        <ListRow
          to={due ? '/ingles/vocabulario' : '/ingles'}
          title="Continuar lección"
          subtitle={due ? `${due} ${due === 1 ? 'tarjeta' : 'tarjetas'} por repasar` : 'Tus tareas de hoy'}
        />
      </div>
    </Card>
  )
}

function NoteCard() {
  const toast = useToast()
  const save = useSaveNote()
  const [text, setText] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    try {
      await save.mutateAsync({ title: '', body, tags: [], pinned: false })
      setText('')
      toast('Nota guardada')
    } catch {
      toast('No se ha podido guardar la nota', 'error')
    }
  }
  return (
    <Card title="Nota rápida">
      <form className={s.noteForm} onSubmit={submit}>
        <label className="field">
          <span className="visually-hidden">Texto de la nota</span>
          <textarea
            className={s.textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Apunta algo…"
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={save.isPending || !text.trim()}>
          Guardar nota
        </button>
      </form>
    </Card>
  )
}

function PersonalCard() {
  const p = usePersonalSummary()
  return (
    <Card title="Personal" flush>
      <ListRow
        to="/personal"
        title="Gastos del mes"
        value={
          p.isLoading
            ? '…'
            : p.monthBudget !== null
              ? `${formatEuros(p.monthSpent)} / ${formatEuros(p.monthBudget)}`
              : formatEuros(p.monthSpent)
        }
      />
      <ListRow
        to="/personal/watchlist"
        title="Watchlist pendiente"
        value={p.isLoading ? '…' : String(p.watchPending)}
      />
    </Card>
  )
}

/** Tarjeta de Hoy por id. */
export function TodayCard({ id }: { id: CardId }) {
  const today = useToday()
  switch (id) {
    case 'kcal':
      return <KcalCard today={today} />
    case 'agenda':
      return <AgendaCard today={today} />
    case 'deadlines':
      return <DeadlinesCard today={today} />
    case 'workout':
      return <WorkoutCard today={today} />
    case 'english':
      return <EnglishCard today={today} />
    case 'note':
      return <NoteCard />
    case 'personal':
      return <PersonalCard />
  }
}
