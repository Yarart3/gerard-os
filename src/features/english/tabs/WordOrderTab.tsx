import { useMemo, useState } from 'react'
import { Card, EmptyState, useToast } from '../../../components/ui'
import { aiMessage, useAi } from '../ai/useAi'
import { checkMyOrder, generateOrderSentences } from '../ai/prompts'
import { orderItem } from '../ai/schemas'
import { useAward, useExercises, useRecordAttempt, useSaveExercises } from '../api'
import { ORDER_SEED } from '../data/exercises'
import { POINTS } from '../logic/daily'
import { checkOrder, hashString, shuffleWords, tokenize } from '../logic/wordOrder'
import s from '../English.module.css'

type Puzzle = { key: string; dbId: string | null; es: string; accepted_orders: string[]; rule: string; tip: string }

export function WordOrderTab() {
  const ex = useExercises('order')
  const save = useSaveExercises('order')
  const toast = useToast()
  const ai = useAi()
  const [rule, setRule] = useState('all')
  const [idx, setIdx] = useState(0)
  const [busy, setBusy] = useState(false)

  const puzzles = useMemo<Puzzle[]>(() => {
    const fromDb = (ex.data ?? []).flatMap((r) => {
      const p = orderItem.safeParse(r.payload)
      return p.success ? [{ key: r.id, dbId: r.id, ...p.data }] : []
    })
    const seed = ORDER_SEED.map((p) => ({ key: p.id, dbId: null, es: p.es, accepted_orders: p.accepted_orders, rule: p.rule, tip: p.tip ?? '' }))
    return [...seed, ...fromDb]
  }, [ex.data])
  const rules = useMemo(() => [...new Set(puzzles.map((p) => p.rule))].sort(), [puzzles])
  const list = puzzles.filter((p) => rule === 'all' || p.rule === rule)
  const puzzle = list[idx % Math.max(1, list.length)]

  const generate = async () => {
    setBusy(true)
    try {
      const topic = rule === 'all' ? (puzzle?.rule ?? 'word order') : rule
      const r = await ai.run(generateOrderSentences(ai.profile, topic, 6, puzzles.map((p) => p.es)))
      await save.mutateAsync(r.items.map((i) => ({ topic: i.rule, payload: i })))
      toast(`${r.items.length} frases nuevas guardadas`)
    } catch (e) {
      toast(aiMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={s.stack}>
      <div className={s.inline}>
        <label className={`field ${s.grow}`}>
          <span className="field-label">Filtrar por regla</span>
          <select className={`input ${s.select}`} value={rule} onChange={(e) => { setRule(e.target.value); setIdx(0) }}>
            <option value="all">Todas</option>
            {rules.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn" onClick={generate} disabled={busy}>
          {busy ? 'Generando…' : 'Generar frases nuevas'}
        </button>
      </div>
      {puzzle ? (
        <PuzzleCard key={puzzle.key + idx} puzzle={puzzle} onNext={() => setIdx((i) => i + 1)} />
      ) : (
        <Card>
          <EmptyState title="Sin frases para esta regla" />
        </Card>
      )}
    </div>
  )
}

function PuzzleCard({ puzzle, onNext }: { puzzle: Puzzle; onNext: () => void }) {
  const award = useAward()
  const attempt = useRecordAttempt()
  const toast = useToast()
  const ai = useAi()
  const first = puzzle.accepted_orders[0]!
  const pool = useMemo(() => shuffleWords(tokenize(first), hashString(puzzle.key)), [first, puzzle.key])
  const [used, setUsed] = useState<number[]>([])
  const [state, setState] = useState<'idle' | 'ok' | 'bad' | 'shown'>('idle')
  const [verdict, setVerdict] = useState('')
  const [busy, setBusy] = useState(false)
  const answer = used.map((i) => pool[i]!)

  const check = () => {
    const ok = checkOrder(answer, puzzle.accepted_orders)
    setState(ok ? 'ok' : 'bad')
    void attempt.mutateAsync({ exercise_id: puzzle.dbId, answer: answer.join(' '), correct: ok, rule: puzzle.rule, feedback: ok ? undefined : first })
    if (ok) void award.mutateAsync(POINTS.order)
  }

  const askAi = async () => {
    setBusy(true)
    try {
      const r = await ai.run(checkMyOrder(ai.profile, puzzle.es, puzzle.accepted_orders, answer.join(' ')))
      setVerdict(`${r.valid ? 'Sí vale. ' : 'No vale. '}${r.explanation}`)
      if (r.valid) void award.mutateAsync(POINTS.order)
    } catch (e) {
      toast(aiMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const locked = state === 'ok' || state === 'shown'
  return (
    <Card title={puzzle.rule}>
      <p className={s.esSentence}>{puzzle.es}</p>
      {puzzle.tip && <p className={s.small}>{puzzle.tip}</p>}
      <div className={s.answerRow} aria-label="Tu frase">
        {answer.length === 0 && <span className={s.small}>Toca las palabras en orden</span>}
        {used.map((p, i) => (
          <button key={p} type="button" className={s.word} disabled={locked} onClick={() => setUsed(used.filter((_, k) => k !== i))}>
            {pool[p]}
          </button>
        ))}
      </div>
      <div className={s.pool} aria-label="Palabras disponibles">
        {pool.map((w, i) => (
          <button key={i} type="button" className={s.word} disabled={used.includes(i) || locked} onClick={() => setUsed([...used, i])}>
            {w}
          </button>
        ))}
      </div>
      {state === 'ok' && <p className={s.ok}>Correcto</p>}
      {state === 'bad' && <p className={s.bad}>No coincide con ningún orden aceptado.</p>}
      {(state === 'shown' || state === 'bad') && (
        <div className={s.answerBox}>
          {puzzle.accepted_orders.map((o) => (
            <div key={o}>{o}</div>
          ))}
        </div>
      )}
      {verdict && <p className={s.example}>{verdict}</p>}
      <div className={s.twoBtns}>
        {state === 'idle' || state === 'bad' ? (
          <>
            <button type="button" className="btn btn-primary" onClick={check} disabled={answer.length === 0}>
              Comprobar
            </button>
            {state === 'bad' ? (
              <button type="button" className="btn" onClick={askAi} disabled={busy}>
                {busy ? 'Preguntando…' : '¿Mi orden también vale?'}
              </button>
            ) : (
              <button type="button" className="btn" onClick={() => setState('shown')}>
                Ver solución
              </button>
            )}
          </>
        ) : (
          <button type="button" className="btn btn-primary" onClick={onNext}>
            Siguiente
          </button>
        )}
      </div>
      {state === 'bad' && (
        <div className={s.twoBtns}>
          <button type="button" className="btn btn-plain" onClick={() => { setUsed([]); setState('idle'); setVerdict('') }}>
            Reintentar
          </button>
          <button type="button" className="btn btn-plain" onClick={onNext}>
            Saltar
          </button>
        </div>
      )}
    </Card>
  )
}
