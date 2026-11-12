import { useMemo, useState, type FormEvent } from 'react'
import { Card, EmptyState, ListRow, SegmentedControl, useToast } from '../../../components/ui'
import type { Json } from '../../../lib/database.types'
import { aiMessage, useAi } from '../ai/useAi'
import { checkSongAnswer, correctRephrase, songLesson } from '../ai/prompts'
import { songLessonBase, type SongLesson } from '../ai/schemas'
import {
  useAddCards,
  useArtists,
  useAward,
  useDeleteArtist,
  useDeleteSong,
  useProfile,
  useRecordAttempt,
  useSaveArtist,
  useSaveSong,
  useSongs,
  type Song,
} from '../api'
import { normalizeWord } from '../logic/diff'
import { POINTS } from '../logic/daily'
import s from '../English.module.css'

const MAX_LINES = 120
const MAX_CHARS = 6000
const lyricLines = (lyrics: string) =>
  lyrics
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_LINES)

const VIEWS = [
  { value: 'songs', label: 'Canciones' },
  { value: 'artists', label: 'Artistas' },
] as const

export function SongsTab() {
  const [view, setView] = useState<'songs' | 'artists'>('songs')
  const [openId, setOpenId] = useState<string | null>(null)
  const songs = useSongs()
  const open = (songs.data ?? []).find((x) => x.id === openId)
  return (
    <div className={s.stack}>
      {!open && <SegmentedControl label="Apartado de canciones" options={VIEWS} value={view} onChange={setView} />}
      {open ? <SongDetail song={open} onBack={() => setOpenId(null)} /> : view === 'songs' ? <SongList onOpen={setOpenId} /> : <Artists />}
    </div>
  )
}

function SongList({ onOpen }: { onOpen: (id: string) => void }) {
  const songs = useSongs()
  const save = useSaveSong()
  const toast = useToast()
  const [artist, setArtist] = useState('')
  const [title, setTitle] = useState('')
  const [lyrics, setLyrics] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!artist.trim() || !title.trim()) return
    try {
      await save.mutateAsync({ artist: artist.trim(), title: title.trim(), lyrics: lyrics.slice(0, MAX_CHARS) || null })
      setArtist('')
      setTitle('')
      setLyrics('')
      toast('Canción guardada')
    } catch {
      toast('No se ha podido guardar', 'error')
    }
  }

  return (
    <>
      <Card title="Nueva canción">
        <form className={s.stack} onSubmit={submit}>
          <input className="input" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artista" aria-label="Artista" />
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" aria-label="Título" />
          <textarea className={s.textarea} value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="Pega aquí la letra. Solo se guarda en tu base de datos privada." aria-label="Letra" />
          <button type="submit" className="btn btn-primary" disabled={save.isPending}>Guardar</button>
        </form>
      </Card>
      <Card title="Mis lecciones" flush>
        {(songs.data ?? []).length === 0 && <EmptyState title="Sin canciones" text="Pega una letra y la IA creará la lección." />}
        {(songs.data ?? []).map((x) => (
          <ListRow key={x.id} title={x.title} subtitle={x.artist} value={x.lesson ? 'Lección lista' : 'Sin lección'} onClick={() => onOpen(x.id)} />
        ))}
      </Card>
    </>
  )
}

function SongDetail({ song, onBack }: { song: Song; onBack: () => void }) {
  const ai = useAi()
  const toast = useToast()
  const save = useSaveSong()
  const del = useDeleteSong()
  const award = useAward()
  const addCards = useAddCards()
  const [busy, setBusy] = useState(false)
  const lines = useMemo(() => lyricLines(song.lyrics ?? ''), [song.lyrics])
  const lesson = useMemo<SongLesson | null>(() => {
    const p = songLessonBase.safeParse(song.lesson)
    return p.success ? p.data : null
  }, [song.lesson])

  const generate = async () => {
    if (lines.length < 4) return toast('Pega la letra completa para crear la lección', 'error')
    setBusy(true)
    try {
      const l = await ai.run(songLesson(ai.profile, song.artist, song.title, lines))
      await save.mutateAsync({ id: song.id, artist: song.artist, title: song.title, lesson: l as unknown as Json })
      void award.mutateAsync(POINTS.lesson)
      toast('Lección creada')
    } catch (e) {
      toast(aiMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = () => {
    if (confirm('¿Eliminar esta canción y su letra?')) void del.mutateAsync(song.id).then(onBack)
  }

  return (
    <>
      <button type="button" className="btn btn-plain" onClick={onBack}>Volver</button>
      <Card title={song.title}>
        <p className={s.muted}>{song.artist}</p>
        <button type="button" className="btn btn-primary" onClick={generate} disabled={busy}>
          {busy ? 'Creando lección…' : lesson ? 'Rehacer la lección con IA' : 'Crear lección con IA'}
        </button>
        {!lesson && <p className={s.small}>Sin IA disponible no se puede crear la lección; la letra queda guardada y puedes reintentarlo.</p>}
      </Card>
      {lesson && (
        <>
          <Card title="De qué trata">
            <p>{lesson.summary}</p>
          </Card>
          {lesson.vocabulary.length > 0 && (
            <Card title="Vocabulario" flush>
              {lesson.vocabulary.map((v) => (
                <div key={v.term} className={s.idiom}>
                  <strong>{v.term}</strong> · {v.translation}
                  {v.note && <div className={s.small}>{v.note}</div>}
                  <button
                    type="button"
                    className="btn btn-plain"
                    onClick={() => addCards.mutateAsync([{ term: v.term, translation: v.translation, example: v.note || undefined, source: 'song' }]).then((n) => toast(n ? 'Añadida a tus tarjetas' : 'Ya la tenías'))}
                  >
                    + A mis tarjetas
                  </button>
                </div>
              ))}
            </Card>
          )}
          {lesson.colloquial.length > 0 && (
            <Card title="Lenguaje coloquial">
              <ul className={s.list}>
                {lesson.colloquial.map((c) => (
                  <li key={c.form}><strong>{c.form}</strong>: {c.meaning}</li>
                ))}
              </ul>
            </Card>
          )}
          {lesson.grammar.length > 0 && (
            <Card title="Gramática">
              <ul className={s.list}>
                {lesson.grammar.map((g) => (
                  <li key={g.point}><strong>{g.point}</strong> (verso {g.line}): {g.explanation}</li>
                ))}
              </ul>
            </Card>
          )}
          <Gaps lines={lines} lesson={lesson} />
          {lesson.rephrase.length > 0 && <Verses lines={lines} items={lesson.rephrase} />}
          {lesson.questions.length > 0 && <Questions items={lesson.questions} />}
        </>
      )}
      <button type="button" className={`btn ${s.danger}`} onClick={remove}>Eliminar canción</button>
    </>
  )
}

const GAP_LABELS = [
  { value: '1', label: 'Fácil' },
  { value: '2', label: 'Medio' },
  { value: '3', label: 'Difícil' },
]

function Gaps({ lines, lesson }: { lines: string[]; lesson: SongLesson }) {
  const award = useAward()
  const [level, setLevel] = useState('2')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState(false)
  const active = lesson.gaps.filter((g) => g.level <= Number(level))
  const byLine = new Map<number, typeof active>()
  for (const g of active) byLine.set(g.line, [...(byLine.get(g.line) ?? []), g])
  const key = (line: number, word: string) => `${line}:${word}`
  const good = active.filter((g) => normalizeWord(answers[key(g.line, g.word)] ?? '') === normalizeWord(g.word)).length

  const check = () => {
    setChecked(true)
    if (good) void award.mutateAsync(Math.min(30, good * POINTS.gaps))
  }

  return (
    <Card title="Completa los huecos">
      <p className={s.small}>Nivel de huecos: más alto, más huecos y más difíciles.</p>
      <SegmentedControl label="Nivel de huecos" options={GAP_LABELS} value={level} onChange={(v) => { setLevel(v); setChecked(false) }} />
      <div className={s.lyrics}>
        {lines.map((text, i) => {
          const gaps = byLine.get(i + 1)
          if (!gaps) return <p key={i} className={s.lyricLine}>{text}</p>
          const chunks = text.split(/(\s+)/)
          const used = new Set<string>()
          return (
            <p key={i} className={s.lyricLine}>
              {chunks.map((c, k) => {
                const g = gaps.find((x) => !used.has(x.word) && normalizeWord(c) === normalizeWord(x.word))
                if (!g) return <span key={k}>{c}</span>
                used.add(g.word)
                const k2 = key(g.line, g.word)
                const ok = normalizeWord(answers[k2] ?? '') === normalizeWord(g.word)
                return (
                  <input
                    key={k}
                    className={`${s.gap} ${checked ? (ok ? s.gapOk : s.gapBad) : ''}`}
                    aria-label={`Hueco del verso ${g.line}`}
                    value={answers[k2] ?? ''}
                    size={Math.max(4, g.word.length)}
                    autoCapitalize="off"
                    autoCorrect="off"
                    onChange={(e) => setAnswers({ ...answers, [k2]: e.target.value })}
                  />
                )
              })}
            </p>
          )
        })}
      </div>
      {checked && <p className={s.small}>{good} de {active.length} correctas. Las erróneas se marcan en rojo.</p>}
      <div className={s.twoBtns}>
        <button type="button" className="btn btn-primary" onClick={check}>Comprobar</button>
        <button type="button" className="btn" onClick={() => { setAnswers(Object.fromEntries(active.map((g) => [key(g.line, g.word), g.word]))); setChecked(true) }}>
          Ver soluciones
        </button>
      </div>
    </Card>
  )
}

function Verses({ lines, items }: { lines: string[]; items: SongLesson['rephrase'] }) {
  const ai = useAi()
  const toast = useToast()
  const attempt = useRecordAttempt()
  const [text, setText] = useState<Record<number, string>>({})
  const [out, setOut] = useState<Record<number, string>>({})
  const go = async (i: number, line: string, instruction: string) => {
    try {
      const r = await ai.run(correctRephrase(ai.profile, line, instruction, text[i] ?? ''))
      setOut({ ...out, [i]: `${r.correct ? 'Correcto. ' : `Mejor: ${r.corrected}. `}${r.explanation}` })
      void attempt.mutateAsync({ answer: text[i] ?? '', correct: r.correct, feedback: r.explanation, rule: r.rule })
    } catch (e) {
      toast(aiMessage(e), 'error')
    }
  }
  return (
    <Card title="Reformula versos">
      {items.map((it, i) => {
        const line = lines[it.line - 1]
        if (!line) return null
        return (
          <div key={i} className={s.version}>
            <p className={s.esSentence}>“{line}”</p>
            <p className={s.instruction}>{it.instruction}</p>
            <textarea className={s.textarea} rows={2} aria-label={`Tu versión del verso ${it.line}`} value={text[i] ?? ''} onChange={(e) => setText({ ...text, [i]: e.target.value })} />
            <button type="button" className="btn" disabled={!(text[i] ?? '').trim()} onClick={() => go(i, line, it.instruction)}>Corregir</button>
            {out[i] && <p className={s.example}>{out[i]}</p>}
          </div>
        )
      })}
    </Card>
  )
}

function Questions({ items }: { items: SongLesson['questions'] }) {
  const ai = useAi()
  const toast = useToast()
  const [text, setText] = useState<Record<number, string>>({})
  const [out, setOut] = useState<Record<number, string>>({})
  const [shown, setShown] = useState<Record<number, boolean>>({})
  const go = async (i: number, q: string) => {
    try {
      const r = await ai.run(checkSongAnswer(ai.profile, q, text[i] ?? ''))
      setOut({ ...out, [i]: `${r.correct ? 'Bien. ' : 'Casi. '}${r.feedback}` })
    } catch (e) {
      toast(`${aiMessage(e)}. Puedes ver una respuesta de ejemplo.`, 'error')
    }
  }
  return (
    <Card title="Preguntas">
      {items.map((it, i) => (
        <div key={i} className={s.version}>
          <p className={s.esSentence}>{it.question}</p>
          <textarea className={s.textarea} rows={2} aria-label={`Respuesta a la pregunta ${i + 1}`} value={text[i] ?? ''} onChange={(e) => setText({ ...text, [i]: e.target.value })} />
          <div className={s.twoBtns}>
            <button type="button" className="btn" disabled={!(text[i] ?? '').trim()} onClick={() => go(i, it.question)}>Corregir con IA</button>
            <button type="button" className="btn btn-plain" onClick={() => setShown({ ...shown, [i]: !shown[i] })}>Respuesta de ejemplo</button>
          </div>
          {out[i] && <p className={s.example}>{out[i]}</p>}
          {shown[i] && <div className={s.answerBox}>{it.sample_answer}</div>}
        </div>
      ))}
    </Card>
  )
}

const isHttps = (u: string) => /^https:\/\/[^\s]+$/i.test(u.trim())
const spotifySearch = (n: string) => `https://open.spotify.com/search/${encodeURIComponent(n)}`
const youtubeSearch = (n: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(n)}`

function Artists() {
  const artists = useArtists()
  const save = useSaveArtist()
  const del = useDeleteArtist()
  const profile = useProfile()
  const toast = useToast()
  const [name, setName] = useState('')
  const [sp, setSp] = useState('')
  const [yt, setYt] = useState('')
  const fromProfile = (profile.data?.answers.artists ?? '').split(',').map((x) => x.trim()).filter(Boolean)
  const known = new Set((artists.data ?? []).map((a) => a.name.toLowerCase()))
  const importable = fromProfile.filter((n) => !known.has(n.toLowerCase()))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if ((sp && !isHttps(sp)) || (yt && !isHttps(yt))) return toast('Los enlaces deben empezar por https://', 'error')
    try {
      await save.mutateAsync({ name: name.trim(), spotify_url: sp.trim() || null, youtube_url: yt.trim() || null })
      setName('')
      setSp('')
      setYt('')
    } catch {
      toast('No se ha podido guardar (¿ya existe?)', 'error')
    }
  }

  return (
    <>
      <Card title="Nuevo artista">
        <form className={s.stack} onSubmit={submit}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" aria-label="Nombre del artista" />
          <input className="input" value={sp} onChange={(e) => setSp(e.target.value)} placeholder="Enlace de Spotify (opcional)" aria-label="Enlace de Spotify" inputMode="url" />
          <input className="input" value={yt} onChange={(e) => setYt(e.target.value)} placeholder="Enlace de YouTube (opcional)" aria-label="Enlace de YouTube" inputMode="url" />
          <button type="submit" className="btn btn-primary">Añadir</button>
        </form>
        {importable.length > 0 && (
          <button type="button" className="btn btn-plain" onClick={() => importable.forEach((n) => void save.mutateAsync({ name: n }))}>
            Importar de mi perfil ({importable.length})
          </button>
        )}
      </Card>
      {(artists.data ?? []).length === 0 && (
        <Card>
          <EmptyState title="Sin artistas" text="Añade los que cantan en inglés y quieras trabajar." />
        </Card>
      )}
      {(artists.data ?? []).map((a) => (
        <Card key={a.id} title={a.name}>
          <div className={s.twoBtns}>
            <a className="btn" href={a.spotify_url && isHttps(a.spotify_url) ? a.spotify_url : spotifySearch(a.name)} target="_blank" rel="noopener noreferrer">Spotify</a>
            <a className="btn" href={a.youtube_url && isHttps(a.youtube_url) ? a.youtube_url : youtubeSearch(a.name)} target="_blank" rel="noopener noreferrer">YouTube</a>
          </div>
          <button type="button" className={`btn btn-plain ${s.dangerText}`} onClick={() => confirm(`¿Quitar a ${a.name}?`) && void del.mutateAsync(a.id)}>
            Quitar
          </button>
        </Card>
      ))}
    </>
  )
}
