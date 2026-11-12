import { useState } from 'react'
import { Card, ListRow, SegmentedControl, useToast } from '../../../components/ui'
import { speak } from '../speech'
import { AudioButtons } from '../AudioButtons'
import { useAward, useProfile, useRecordAttempt } from '../api'
import { COLLOQUIAL } from '../data/colloquial'
import { DICTATION_SEED } from '../data/exercises'
import { diffScore, diffWords, isPerfect, type DiffItem } from '../logic/diff'
import { POINTS } from '../logic/daily'
import { SPEEDS } from '../speech'
import { useEnglishSettings } from '../englishSettings'
import s from '../English.module.css'

const VIEWS = [
  { value: 'dictation', label: 'Dictados' },
  { value: 'colloquial', label: 'Coloquial' },
] as const

export function ListeningTab() {
  const [view, setView] = useState<'dictation' | 'colloquial'>('dictation')
  return (
    <div className={s.stack}>
      <SegmentedControl label="Tipo de ejercicio de oído" options={VIEWS} value={view} onChange={setView} />
      {view === 'dictation' ? <Dictation /> : <ColloquialList />}
    </div>
  )
}

function Dictation() {
  const cfg = useEnglishSettings()
  const profile = useProfile()
  const award = useAward()
  const attempt = useRecordAttempt()
  const toast = useToast()
  const [idx, setIdx] = useState(0)
  const [rate, setRate] = useState<number>(cfg.value.speed)
  const [text, setText] = useState('')
  const [diff, setDiff] = useState<DiffItem[] | null>(null)
  const item = DICTATION_SEED[idx % DICTATION_SEED.length]!

  const play = () => speak(item.text, { rate, accent: profile.data?.answers.accent ?? 'alternate', voiceUri: cfg.value.voice_uri })
  const check = () => {
    const d = diffWords(item.text, text)
    setDiff(d)
    const perfect = isPerfect(d)
    void attempt.mutateAsync({ answer: text, correct: perfect, feedback: `${diffScore(d)}%`, rule: 'dictado' })
    if (perfect || diffScore(d) >= 70) void award.mutateAsync(POINTS.dictation)
    if (perfect) toast('Perfecto')
  }
  const next = () => {
    setIdx((i) => i + 1)
    setText('')
    setDiff(null)
  }

  return (
    <Card title={`Dictado ${(idx % DICTATION_SEED.length) + 1} de ${DICTATION_SEED.length}`}>
      <div className={s.stack}>
        <SegmentedControl
          label="Velocidad del dictado"
          options={SPEEDS.map((v) => ({ value: String(v), label: `${String(v).replace('.', ',')}×` }))}
          value={String(rate)}
          onChange={(v) => setRate(Number(v))}
        />
        <div className={s.twoBtns}>
          <button type="button" className="btn btn-primary" onClick={play}>
            Escuchar
          </button>
          <button type="button" className="btn" onClick={() => speak(item.text, { rate: 0.6, accent: profile.data?.answers.accent ?? 'alternate', voiceUri: cfg.value.voice_uri })}>
            Más despacio
          </button>
        </div>
        <textarea className={s.textarea} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe lo que oyes" aria-label="Lo que oyes" disabled={diff !== null} autoCapitalize="off" autoCorrect="off" />
        {diff ? (
          <>
            <p className={s.diff} aria-label="Comparación palabra por palabra">
              {diff.map((d, i) =>
                d.type === 'ok' ? (
                  <span key={i} className={s.dOk}>{d.word} </span>
                ) : d.type === 'wrong' ? (
                  <span key={i} className={s.dWrong}>
                    <s>{d.got}</s> {d.expected}{' '}
                  </span>
                ) : d.type === 'missing' ? (
                  <span key={i} className={s.dMissing}>[{d.expected}] </span>
                ) : (
                  <span key={i} className={s.dExtra}><s>{d.got}</s> </span>
                ),
              )}
            </p>
            <p className={s.small}>
              {diffScore(diff)} % · <span className={s.dOk}>correcta</span> · <span className={s.dWrong}>incorrecta</span> · <span className={s.dMissing}>falta</span> · <span className={s.dExtra}>sobra</span>
            </p>
            <button type="button" className="btn btn-primary" onClick={next}>
              Siguiente dictado
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary" onClick={check} disabled={!text.trim()}>
            Comprobar
          </button>
        )}
      </div>
    </Card>
  )
}

function ColloquialList() {
  return (
    <Card title="Inglés hablado" flush>
      {COLLOQUIAL.map((c) => (
        <div key={c.form} className={s.colRow}>
          <ListRow title={`${c.form} = ${c.full}`} subtitle={`${c.meaning} · ${c.example}`} />
          <div className={s.colAudio}>
            <AudioButtons text={c.say} />
          </div>
        </div>
      ))}
    </Card>
  )
}
