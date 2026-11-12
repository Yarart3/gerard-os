import { Volume } from '../../components/ui/icons'
import { useProfile } from './api'
import { useEnglishSettings } from './englishSettings'
import { SLOW, speak, speechSupported } from './speech'
import s from './English.module.css'

type Props = { text: string; rate?: number; label?: string }

/** Botones "Escuchar" y "Más despacio" con la velocidad y el acento configurados. */
export function AudioButtons({ text, rate, label = 'Escuchar' }: Props) {
  const cfg = useEnglishSettings()
  const profile = useProfile()
  if (!speechSupported()) return null
  const accent = profile.data?.answers.accent ?? 'alternate'
  const play = (r: number) => speak(text, { rate: r, accent, voiceUri: cfg.value.voice_uri })
  return (
    <span className={s.audio}>
      <button type="button" className={s.audioBtn} onClick={() => play(rate ?? cfg.value.speed)} aria-label={`${label}: ${text}`}>
        <Volume size={18} /> <span>{label}</span>
      </button>
      <button type="button" className={s.audioBtn} onClick={() => play(SLOW)} aria-label={`Más despacio: ${text}`}>
        Más despacio
      </button>
    </span>
  )
}
