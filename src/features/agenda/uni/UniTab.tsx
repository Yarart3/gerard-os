import { useMemo, useState } from 'react'
import { Card, EmptyState, ListRow, Pill, ProgressBar } from '../../../components/ui'
import { Plus } from '../../../components/ui/icons'
import { formatDayMonth, todayISO } from '../../../lib/dates'
import { formatNumber } from '../../../lib/format'
import { localDateISO } from '../../../../supabase/functions/_shared/time.ts'
import { useAgendaSettings } from '../agendaSettings'
import {
  useDeadlines,
  useMilestones,
  useSaveDeadline,
  useSubjects,
  type Deadline,
  type Milestone,
  type Subject,
} from '../api'
import { countdown, tfgProgress, weightedAverage } from '../logic/uni'
import { DeadlineSheet } from './DeadlineSheet'
import { MilestoneSheet } from './MilestoneSheet'
import { SubjectSheet } from './SubjectSheet'
import s from '../Agenda.module.css'

const KIND_LABEL: Record<string, string> = { assignment: 'Entrega', exam: 'Examen', other: 'Otro' }

export function UniTab() {
  const { value: cfg } = useAgendaSettings()
  const subjects = useSubjects()
  const deadlines = useDeadlines()
  const milestones = useMilestones()
  const saveDeadline = useSaveDeadline()
  const today = todayISO()
  const [subject, setSubject] = useState<Subject | 'new' | null>(null)
  const [deadline, setDeadline] = useState<Deadline | 'new' | null>(null)
  const [milestone, setMilestone] = useState<Milestone | 'new' | null>(null)
  const [showDone, setShowDone] = useState(false)

  const subs = useMemo(() => subjects.data ?? [], [subjects.data])
  const subjectById = useMemo(() => new Map(subs.map((x) => [x.id, x])), [subs])
  const avg = weightedAverage(subs)
  const pending = (deadlines.data ?? []).filter((d) => !d.done)
  const done = (deadlines.data ?? []).filter((d) => d.done)
  const shown = showDone ? [...pending, ...done] : pending
  const ms = milestones.data ?? []
  const nextExam = pending.find((d) => d.kind === 'exam' && localDateISO(Date.parse(d.due_at)) >= today)

  return (
    <div className={s.grid2}>
      <div className={s.stack}>
        <Card title="Media ponderada">
          <div className={s.stats}>
            <div className={s.stat}>
              <span className={s.statValue}>{avg.average === null ? '—' : formatNumber(avg.average, 2, 2)}</span>
              <span className={s.statLabel}>Nota media (0–10)</span>
            </div>
            <div className={s.stat}>
              <span className={s.statValue}>
                {formatNumber(avg.gradedEcts, 1)} / {formatNumber(avg.totalEcts, 1)}
              </span>
              <span className={s.statLabel}>ECTS con nota / totales</span>
            </div>
          </div>
        </Card>

        <Card
          title="Asignaturas"
          action={
            <button type="button" className={`btn btn-plain`} onClick={() => setSubject('new')}>
              <Plus size={18} /> Añadir
            </button>
          }
          flush
        >
          {subs.length ? (
            subs.map((x) => (
              <ListRow
                key={x.id}
                icon={<span className={s.dot} style={{ background: x.color ?? 'var(--muted)' }} />}
                title={x.name}
                subtitle={[x.course ? `${x.course}.º curso` : null, x.term ? `${x.term}.º cuatrimestre` : null, x.ects != null ? `${formatNumber(x.ects, 1)} ECTS` : null]
                  .filter(Boolean)
                  .join(' · ')}
                value={x.grade == null ? 'Sin nota' : formatNumber(x.grade, 2, 2)}
                onClick={() => setSubject(x)}
              />
            ))
          ) : (
            <EmptyState title="Sin asignaturas" text="Añade tus asignaturas para llevar las notas y las entregas." />
          )}
        </Card>
      </div>

      <div className={s.stack}>
        <Card
          title="Entregas y exámenes"
          action={
            <button type="button" className="btn btn-plain" onClick={() => setDeadline('new')}>
              <Plus size={18} /> Añadir
            </button>
          }
          flush
        >
          {nextExam && (
            <p className={s.empty} style={{ paddingBottom: 4 }}>
              Próximo examen: <strong>{nextExam.title}</strong>, {countdown(nextExam.due_at, today).label.toLowerCase()}.
            </p>
          )}
          {shown.length ? (
            shown.map((d) => {
              const c = countdown(d.due_at, today, { done: d.done, alertDays: cfg.deadline_alert_days })
              const sub = d.subject_id ? subjectById.get(d.subject_id) : undefined
              return (
                <ListRow
                  key={d.id}
                  icon={
                    <input
                      type="checkbox"
                      className={s.checkbox}
                      checked={d.done}
                      aria-label={`Marcar «${d.title}» como hecha`}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => saveDeadline.mutate({ id: d.id, title: d.title, due_at: d.due_at, done: e.target.checked })}
                    />
                  }
                  title={d.title}
                  subtitle={[KIND_LABEL[d.kind] ?? d.kind, sub?.name, formatDayMonth(localDateISO(Date.parse(d.due_at)))].filter(Boolean).join(' · ')}
                  value={<Pill tone={c.tone}>{c.label}</Pill>}
                  onClick={() => setDeadline(d)}
                />
              )
            })
          ) : (
            <EmptyState title="Nada pendiente" text="Añade entregas y exámenes para ver la cuenta atrás." />
          )}
          {done.length > 0 && (
            <button type="button" className="btn btn-plain" style={{ width: '100%' }} onClick={() => setShowDone((v) => !v)}>
              {showDone ? 'Ocultar hechas' : `Ver hechas (${done.length})`}
            </button>
          )}
        </Card>

        <Card
          title="TFG"
          action={
            <button type="button" className="btn btn-plain" onClick={() => setMilestone('new')}>
              <Plus size={18} /> Hito
            </button>
          }
          flush
        >
          {ms.length ? (
            <>
              <div style={{ padding: '4px var(--pad-card) 12px' }}>
                <ProgressBar value={tfgProgress(ms)} label="Progreso total del TFG" tone="green" />
                <span className={s.small}>Progreso total: {formatNumber(tfgProgress(ms) * 100, 0)} %</span>
              </div>
              {ms.map((m) => (
                <button key={m.id} type="button" className={s.milestone} onClick={() => setMilestone(m)}>
                  <span className={s.milestoneHead}>
                    <span>{m.title}</span>
                    <span className={s.small}>{m.progress} %</span>
                  </span>
                  <ProgressBar value={m.progress / 100} label={`Progreso de ${m.title}`} />
                  {m.due_at && <span className={s.small}>Objetivo: {formatDayMonth(m.due_at)}</span>}
                </button>
              ))}
            </>
          ) : (
            <EmptyState title="Sin hitos" text="Divide el TFG en hitos y ve marcando el progreso." />
          )}
        </Card>
      </div>

      <SubjectSheet subject={subject} onClose={() => setSubject(null)} />
      <DeadlineSheet deadline={deadline} subjects={subs} onClose={() => setDeadline(null)} />
      <MilestoneSheet milestone={milestone} nextPosition={ms.length} onClose={() => setMilestone(null)} />
    </div>
  )
}
