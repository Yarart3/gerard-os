import { useState } from 'react'
import { Card, SegmentedControl, useToast } from '../../../components/ui'
import { AudioButtons } from '../AudioButtons'
import { useAddCards, useAward } from '../api'
import { GRAMMAR_RULES, ROLE_LABEL, type Role } from '../data/grammar'
import { IDIOMS } from '../data/idioms'
import { POINTS } from '../logic/daily'
import s from '../English.module.css'

const VIEWS = [
  { value: 'rules', label: 'Cómo se construyen' },
  { value: 'idioms', label: 'Frases hechas' },
] as const

export function GrammarTab() {
  const [view, setView] = useState<'rules' | 'idioms'>('rules')
  return (
    <div className={s.stack}>
      <SegmentedControl label="Apartado de gramática" options={VIEWS} value={view} onChange={setView} />
      {view === 'rules' ? <Rules /> : <Idioms />}
    </div>
  )
}

function Rules() {
  const used = new Set<Role>(GRAMMAR_RULES.flatMap((r) => r.examples.flat().map((p) => p.r)))
  return (
    <>
      <Card title="Colores por función">
        <div className={s.legend}>
          {[...used].map((r) => (
            <span key={r} className={`${s.block} ${s[`role_${r}`]}`}>
              {ROLE_LABEL[r]}
            </span>
          ))}
        </div>
      </Card>
      {GRAMMAR_RULES.map((rule) => (
        <Card key={rule.id} title={rule.title}>
          <p className={s.muted}>{rule.rule}</p>
          {rule.examples.map((ex, i) => {
            const text = ex.map((p) => p.t).join(' ').replace(/ ,/g, ',')
            return (
              <div key={i} className={s.example2}>
                <div className={s.blocks}>
                  {ex.map((p, k) => (
                    <span key={k} className={`${s.block} ${s[`role_${p.r}`]}`} title={ROLE_LABEL[p.r]}>
                      {p.t}
                    </span>
                  ))}
                </div>
                <AudioButtons text={text} />
              </div>
            )
          })}
          <p className={s.trick}>Truco: {rule.trick}</p>
        </Card>
      ))}
    </>
  )
}

function Idioms() {
  const [game, setGame] = useState(false)
  return (
    <>
      <SegmentedControl
        label="Modo de frases hechas"
        options={[
          { value: 'list', label: 'Lista' },
          { value: 'game', label: 'Minijuego' },
        ]}
        value={game ? 'game' : 'list'}
        onChange={(v) => setGame(v === 'game')}
      />
      {game ? <IdiomGame /> : <IdiomList />}
    </>
  )
}

function IdiomList() {
  const add = useAddCards()
  const toast = useToast()
  return (
    <Card title="30 frases hechas" flush>
      {IDIOMS.map((i) => (
        <div key={i.phrase} className={s.idiom}>
          <strong>{i.phrase}</strong>
          <div className={s.small}>Literal: {i.literal}</div>
          <div>Significa: {i.meaning}</div>
          <div className={s.example}>{i.example}</div>
          <div className={s.twoBtns}>
            <AudioButtons text={i.phrase} />
            <button
              type="button"
              className="btn btn-plain"
              onClick={() =>
                add
                  .mutateAsync([{ term: i.phrase, translation: i.meaning, example: i.example, source: 'phrase' }])
                  .then((n) => toast(n ? 'Añadida a tus tarjetas' : 'Ya está en tus tarjetas', n ? undefined : 'error'))
                  .catch(() => toast('No se ha podido añadir', 'error'))
              }
            >
              + A mis tarjetas
            </button>
          </div>
        </div>
      ))}
    </Card>
  )
}

function IdiomGame() {
  const award = useAward()
  const [n, setN] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const idiom = IDIOMS[n % IDIOMS.length]!
  const options = [0, 7, 13].map((o) => IDIOMS[(n + o) % IDIOMS.length]!.meaning)
  const choices = [...new Set(options.concat(idiom.meaning))].sort((a, b) => ((a.length * 7 + n) % 5) - ((b.length * 7 + n) % 5))

  const pick = (m: string) => {
    if (picked) return
    setPicked(m)
    if (m === idiom.meaning) void award.mutateAsync(POINTS.idiom)
  }

  return (
    <Card title={`¿Qué significa "${idiom.phrase}"?`}>
      <p className={s.small}>Literal: {idiom.literal}</p>
      <div className={s.stack}>
        {choices.map((m) => (
          <button
            key={m}
            type="button"
            className={`btn ${picked && m === idiom.meaning ? s.correctBtn : ''} ${picked === m && m !== idiom.meaning ? s.wrongBtn : ''}`}
            onClick={() => pick(m)}
          >
            {m}
          </button>
        ))}
      </div>
      {picked && (
        <>
          <p className={s.example}>{idiom.example}</p>
          <button type="button" className="btn btn-primary" onClick={() => { setN(n + 1); setPicked(null) }}>
            Siguiente
          </button>
        </>
      )}
    </Card>
  )
}
