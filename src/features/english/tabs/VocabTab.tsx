import { useMemo, useState, type FormEvent } from 'react'
import { Card, EmptyState, ListRow, Pill, SearchInput, SegmentedControl, useToast } from '../../../components/ui'
import { AudioButtons } from '../AudioButtons'
import { aiMessage, useAi } from '../ai/useAi'
import { vocabBatch } from '../ai/prompts'
import { useAddCards, useAward, useDeleteCard, useRecordAttempt, useReviewCard, useVocab, type VocabCard } from '../api'
import { VOCAB_SEED } from '../data/vocabSeed'
import { boxCounts, isDue } from '../logic/leitner'
import { sameTerm } from '../logic/diff'
import { POINTS } from '../logic/daily'
import s from '../English.module.css'
import { useToday } from '../../../lib/useToday'

const MODES = [
  { value: 'review', label: 'Repasar' },
  { value: 'write', label: 'Escribir' },
  { value: 'list', label: 'Lista' },
] as const
type Mode = (typeof MODES)[number]['value']

export function VocabTab() {
  const [mode, setMode] = useState<Mode>('review')
  const vocab = useVocab()
  const add = useAddCards()
  const toast = useToast()
  const cards = vocab.data ?? []
  const counts = boxCounts(cards)

  const loadSeed = () =>
    add
      .mutateAsync(VOCAB_SEED.map((w) => ({ ...w, source: 'seed' })))
      .then((n) => toast(`${n} tarjetas añadidas`))
      .catch(() => toast('No se han podido añadir', 'error'))

  if (!vocab.isLoading && cards.length === 0)
    return (
      <Card>
        <EmptyState title="Aún no tienes tarjetas" text="Carga unas 60 palabras de nivel B2 con traducción y ejemplo para empezar." />
        <button type="button" className="btn btn-primary" onClick={loadSeed} disabled={add.isPending}>
          Cargar vocabulario inicial
        </button>
      </Card>
    )

  return (
    <div className={s.stack}>
      <SegmentedControl label="Modo de vocabulario" options={MODES} value={mode} onChange={setMode} />
      <div className={s.boxes}>
        {([1, 2, 3, 4] as const).map((b) => (
          <Pill key={b} tone={b === 4 ? 'green' : 'default'}>
            Caja {b}: {counts[b]}
          </Pill>
        ))}
      </div>
      {mode === 'review' && <Review cards={cards} write={false} />}
      {mode === 'write' && <Review cards={cards} write />}
      {mode === 'list' && <WordList cards={cards} />}
    </div>
  )
}

function Review({ cards, write }: { cards: VocabCard[]; write: boolean }) {
  const today = useToday()
  const due = useMemo(() => cards.filter((c) => isDue(c, today)).sort((a, b) => a.box - b.box), [cards, today])
  const review = useReviewCard()
  const award = useAward()
  const attempt = useRecordAttempt()
  const [shown, setShown] = useState(false)
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState<null | boolean>(null)
  const card = due[0]

  if (!card)
    return (
      <Card>
        <EmptyState title="Todo repasado por hoy" text="Vuelve mañana: las tarjetas reaparecen a 1, 3, 7 y 16 días." />
      </Card>
    )

  const finish = (correct: boolean) => {
    void review.mutateAsync({ card, correct })
    if (correct) void award.mutateAsync(POINTS.vocab)
    else void attempt.mutateAsync({ answer: card.term, correct: false, feedback: card.translation, rule: 'vocabulario' })
    setShown(false)
    setTyped('')
    setResult(null)
  }

  const check = (e: FormEvent) => {
    e.preventDefault()
    const ok = sameTerm(typed, card.term)
    setResult(ok)
  }

  return (
    <Card>
      <p className={s.small}>
        Caja {card.box} · quedan {due.length}
      </p>
      <h3 className={s.flashTerm}>{write ? card.translation : card.term}</h3>
      {!write && (
        <>
          <AudioButtons text={card.term} />
          {shown && (
            <div className={s.answerBox}>
              <strong>{card.translation}</strong>
              {card.example && <p className={s.example}>{card.example}</p>}
            </div>
          )}
          {!shown ? (
            <button type="button" className="btn btn-primary" onClick={() => setShown(true)}>
              Mostrar respuesta
            </button>
          ) : (
            <div className={s.twoBtns}>
              <button type="button" className={`btn ${s.danger}`} onClick={() => finish(false)}>
                Fallé
              </button>
              <button type="button" className="btn btn-primary" onClick={() => finish(true)}>
                Lo sabía
              </button>
            </div>
          )}
        </>
      )}
      {write && (
        <form onSubmit={check} className={s.stack}>
          <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Escríbelo en inglés" aria-label="Respuesta en inglés" autoCapitalize="off" autoCorrect="off" disabled={result !== null} />
          {result === null ? (
            <button type="submit" className="btn btn-primary" disabled={!typed.trim()}>
              Comprobar
            </button>
          ) : (
            <>
              <p className={result ? s.ok : s.bad}>{result ? 'Correcto' : `Era: ${card.term}`}</p>
              {card.example && <p className={s.example}>{card.example}</p>}
              <button type="button" className="btn btn-primary" onClick={() => finish(result)}>
                Siguiente
              </button>
            </>
          )}
        </form>
      )}
    </Card>
  )
}

function WordList({ cards }: { cards: VocabCard[] }) {
  const toast = useToast()
  const add = useAddCards()
  const del = useDeleteCard()
  const ai = useAi()
  const [q, setQ] = useState('')
  const [term, setTerm] = useState('')
  const [tr, setTr] = useState('')
  const [ex, setEx] = useState('')
  const [busy, setBusy] = useState(false)
  const shown = cards.filter((c) => !q.trim() || `${c.term} ${c.translation}`.toLowerCase().includes(q.trim().toLowerCase()))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!term.trim() || !tr.trim()) return
    const n = await add.mutateAsync([{ term, translation: tr.trim(), example: ex.trim() || undefined, source: 'user' }])
    toast(n ? 'Palabra añadida' : 'Esa palabra ya existe', n ? undefined : 'error')
    setTerm('')
    setTr('')
    setEx('')
  }

  const generate = async () => {
    setBusy(true)
    try {
      const r = await ai.run(vocabBatch(ai.profile, 30, cards.map((c) => c.term)))
      const n = await add.mutateAsync(r.words.map((w) => ({ ...w, source: 'ai' })))
      toast(`${n} palabras nuevas`)
    } catch (e) {
      toast(aiMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Card title="Añadir palabra">
        <form className={s.stack} onSubmit={submit}>
          <input className="input" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Inglés" aria-label="Palabra en inglés" />
          <input className="input" value={tr} onChange={(e) => setTr(e.target.value)} placeholder="Traducción" aria-label="Traducción" />
          <input className="input" value={ex} onChange={(e) => setEx(e.target.value)} placeholder="Ejemplo (opcional)" aria-label="Ejemplo" />
          <button type="submit" className="btn">Añadir</button>
        </form>
        <button type="button" className="btn btn-plain" onClick={generate} disabled={busy}>
          {busy ? 'Generando…' : 'Generar 30 más con IA'}
        </button>
      </Card>
      <SearchInput value={q} onChange={setQ} label="Buscar palabras" />
      <Card flush>
        {shown.length === 0 && <p className={s.empty}>Sin resultados.</p>}
        {shown.map((c) => (
          <ListRow
            key={c.id}
            title={c.term}
            subtitle={c.translation}
            value={`Caja ${c.box}`}
            onClick={() => {
              if (confirm(`¿Eliminar "${c.term}"?`)) void del.mutateAsync(c.id)
            }}
          />
        ))}
      </Card>
    </>
  )
}
