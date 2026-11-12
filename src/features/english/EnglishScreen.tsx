import { useState } from 'react'
import { Card } from '../../components/ui'
import { useProfile } from './api'
import { DEFAULT_LEVEL, EMPTY_ANSWERS } from './profile'
import { ProfileForm } from './ProfileForm'
import { GrammarTab } from './tabs/GrammarTab'
import { ListeningTab } from './tabs/ListeningTab'
import { RephraseTab } from './tabs/RephraseTab'
import { SongsTab } from './tabs/SongsTab'
import { TodayTab } from './tabs/TodayTab'
import { VocabTab } from './tabs/VocabTab'
import { WordOrderTab } from './tabs/WordOrderTab'
import s from './English.module.css'

/** Contenido de Inglés según el apartado. La primera vez pide el cuestionario (se puede posponer). */
export default function EnglishScreen({ sub }: { sub: string }) {
  const profile = useProfile()
  const [skipped, setSkipped] = useState(false)

  if (profile.isLoading) return <p className={s.muted}>Cargando…</p>
  if (!profile.data && !skipped) {
    return (
      <Card title="Cuéntame sobre tu inglés">
        <p className={s.muted}>
          Unas preguntas para adaptar los ejercicios y los ejemplos a ti. Todo es opcional y lo puedes cambiar luego en Ajustes.
        </p>
        <ProfileForm initial={{ level: DEFAULT_LEVEL, answers: EMPTY_ANSWERS }} onDone={() => undefined} submitLabel="Empezar" />
        <button type="button" className="btn btn-plain" onClick={() => setSkipped(true)}>
          Ahora no
        </button>
      </Card>
    )
  }

  switch (sub) {
    case 'reformular':
      return <RephraseTab />
    case 'vocabulario':
      return <VocabTab />
    case 'oido':
      return <ListeningTab />
    case 'canciones':
      return <SongsTab />
    case 'gramatica':
      return <GrammarTab />
    case 'orden':
      return <WordOrderTab />
    default:
      return <TodayTab />
  }
}
