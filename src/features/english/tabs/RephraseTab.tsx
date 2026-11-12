import { useMemo, useState, type FormEvent } from 'react'
import { Card, EmptyState, SegmentedControl, useToast } from '../../../components/ui'
import { aiMessage, useAi } from '../ai/useAi'
import { correctRephrase, fixMySentence, generateMoreByTopic } from '../ai/prompts'
import { rephraseItem } from '../ai/schemas'
import { useAward, useExercises, useRecordAttempt, useSaveExercises } from '../api'
import { REPHRASE_SEED, REPHRASE_TOPICS } from '../data/exercises'
import { POINTS } from '../logic/daily'
import s from '../English.module.css'

type Item = { key: string; dbId: string | null; topic: string; sentence: string; instruction: string; model_answers: string[]; rule: string }
type Verdict = { correct: boolean; corrected: string; explanation: string }

const VIEWS = [
  { value: 'bank', label: 'Banco de ejercicios' },
  { value: 'fix', label: 'Corregir mi frase' },
] as const

export function RephraseTab() {
  const [view, setView] = useState<'bank' | 'fix'>('bank')
  return (
    <div className={s.stack}>
      <SegmentedControl label="Modo de reformular" options={VIEWS} value={view} onChange={setView} />
      {view === 'bank' ? <Bank /> : <FixSentence />}
    </div>
  )
}

function Bank() {
  const ex = useExercises('rephrase')
  const save = useSaveExercises('rephrase')
  const toast = useToast()
  const ai = useAi()
  const [topic, setTopic] = useState<string>(REPHRASE_TOPICS[0].value)
  const [idx, setIdx] = useState(0)
  const [busy, setBusy] = useState(false)

  const items = useMemo<Item[]>(() => {
    const fromDb = (ex.data ?? []).flatMap((r) => {
      const p = rephraseItem.omit({ model_answers: true }).safeParse(r.payload)
      const sol = r.solution as { model_answers?: string[] } | null
      return p.success && sol?.model_answers?.length
        ? [{ key: r.id, dbId: r.id, topic: r.topic ?? '', ...p.data, model_answers: sol.model_answers }]
        : []
    })
    const seed = REPHRASE_SEED.map((p) => ({ ...p, key: p.id, dbId: null }))
    return [...seed, ...fromDb].filter((i) => i.topic === topic)
  }, [ex.data, topic])
  const item = items[idx % Math.max(1, items.length)]

  const more = async () => {
    setBusy(true)
    try {
      const label = REPHRASE_TOPICS.find((t) => t.value === topic)?.label ?? topic
      const r = await ai.run(generateMoreByTopic(ai.profile, label, items.map((i) => i.sentence), 5))
      await save.mutateAsync(r.items.map((i) => ({ topic, payload: { sentence: i.sentence, instruction: i.instruction, rule: i.rule }, solution: { model_answers: i.model_answers } })))
      toast(`${r.items.length} ejercicios guardados`)
    } catch (e) {
      toast(aiMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className={s.inline}>
        <label className={`field ${s.grow}`}>
          <span className="field-label">Tema de gramática</span>
          <select className={`input ${s.select}`} value={topic} onChange={(e) => { setTopic(e.target.value); setIdx(0) }}>
            {REPHRASE_TOPICS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn" onClick={more} disabled={busy}>
          {busy ? 'Generando…' : 'Generar más'}
        </button>
      </div>
      {item ? (
        <Exercise key={item.key + idx} item={item} onNext={() => setIdx((i) => i + 1)} />
      ) : (
        <Card>
          <EmptyState title="Sin ejercicios en este tema" text="Pulsa «Generar más»." />
        </Card>
      )}
    </>
  )
}

function Exercise({ item, onNext }: { item: Item; onNext: () => void }) {
  const ai = useAi()
  const toast = useToast()
  const award = useAward()
  const attempt = useRecordAttempt()
  const [versions, setVersions] = useState(['', '', ''])
  const [verdicts, setVerdicts] = useState<(Verdict | null)[]>([null, null, null])
  const [busy, setBusy] = useState<number | null>(null)
  const [solution, setSolution] = useState(false)

  const correct = async (i: number) => {
    const text = versions[i]!.trim()
    if (!text) return
    setBusy(i)
    try {
      const r = await ai.run(correctRephrase(ai.profile, item.sentence, item.instruction, text))
      setVerdicts((v) => v.map((x, k) => (k === i ? r : x)))
      void attempt.mutateAsync({ exercise_id: item.dbId, answer: text, correct: r.correct, feedback: r.explanation, rule: r.rule || item.rule })
      if (r.correct) void award.mutateAsync(POINTS.rephrase)
    } catch (e) {
      toast(`${aiMessage(e)}. Puedes ver la solución.`, 'error')
      setSolution(true)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card title={item.rule}>
      <p className={s.esSentence}>{item.sentence}</p>
      <p className={s.instruction}>{item.instruction}</p>
      {versions.map((v, i) => (
        <div key={i} className={s.version}>
          <textarea
            className={s.textarea}
            rows={2}
            value={v}
            aria-label={`Versión ${i + 1}`}
            placeholder={`Versión ${i + 1}`}
            onChange={(e) => setVersions((x) => x.map((y, k) => (k === i ? e.target.value : y)))}
          />
          <button type="button" className="btn" onClick={() => correct(i)} disabled={busy !== null || !v.trim()}>
            {busy === i ? 'Corrigiendo…' : 'Corregir'}
          </button>
          {verdicts[i] && (
            <p className={verdicts[i]!.correct ? s.ok : s.bad}>
              {verdicts[i]!.correct ? 'Correcto. ' : `Mejor: ${verdicts[i]!.corrected}. `}
              <span className={s.example}>{verdicts[i]!.explanation}</span>
            </p>
          )}
        </div>
      ))}
      {solution && (
        <div className={s.answerBox}>
          {item.model_answers.map((a) => (
            <div key={a}>{a}</div>
          ))}
        </div>
      )}
      <div className={s.twoBtns}>
        <button type="button" className="btn" onClick={() => setSolution((x) => !x)}>
          {solution ? 'Ocultar solución' : 'Ver solución'}
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Siguiente
        </button>
      </div>
    </Card>
  )
}

function FixSentence() {
  const ai = useAi()
  const toast = useToast()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<Awaited<ReturnType<typeof run>> | null>(null)
  const run = (t: string) => ai.run(fixMySentence(ai.profile, t))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    try {
      setRes(await run(text.trim()))
    } catch (err) {
      toast(aiMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Corregir mi frase">
      <form className={s.stack} onSubmit={submit}>
        <textarea className={s.textarea} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe una frase en inglés" aria-label="Tu frase en inglés" />
        <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()}>
          {busy ? 'Corrigiendo…' : 'Corregir y dar 3 formas de decirla'}
        </button>
      </form>
      {res && (
        <div className={s.stack}>
          <p className={s.ok}>{res.corrected}</p>
          <p className={s.example}>{res.explanation}</p>
          <ol className={s.alts}>
            {res.alternatives.map((a) => (
              <li key={a.text}>
                <strong>{a.text}</strong>
                <div className={s.small}>{a.note}</div>
              </li>
            ))}
          </ol>
        </div>
      )}
      <p className={s.small}>Necesita la IA. Sin ella, usa el banco de ejercicios.</p>
    </Card>
  )
}
