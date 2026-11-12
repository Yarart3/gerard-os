// Audio con la voz del navegador (speechSynthesis). Sin servidor, sin coste.
export const SPEEDS = [0.6, 0.8, 1, 1.2] as const
export const SLOW = 0.6
export type AccentPref = 'alternate' | 'en-GB' | 'en-US'

export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

let flip = 0
/** Acento para esta reproducción: fijo o alternando en-GB / en-US. */
export function nextLang(accent: AccentPref): 'en-GB' | 'en-US' {
  if (accent !== 'alternate') return accent
  flip = 1 - flip
  return flip ? 'en-GB' : 'en-US'
}

const family = (lang: string) => lang.replace('_', '-').toLowerCase()

export function englishVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return []
  return window.speechSynthesis.getVoices().filter((v) => family(v.lang).startsWith('en'))
}

export function pickVoice(lang: string, voiceUri: string | null): SpeechSynthesisVoice | undefined {
  const voices = englishVoices()
  return voices.find((v) => voiceUri && v.voiceURI === voiceUri) ?? voices.find((v) => family(v.lang) === family(lang))
}

export type SpeakOptions = { rate?: number; accent?: AccentPref; voiceUri?: string | null; lang?: 'en-GB' | 'en-US' }

/** Lee `text` en inglés. Devuelve false si el navegador no soporta síntesis de voz. */
export function speak(text: string, o: SpeakOptions = {}): boolean {
  if (!speechSupported()) return false
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const lang = o.lang ?? nextLang(o.accent ?? 'alternate')
  const voice = pickVoice(lang, o.voiceUri ?? null)
  u.lang = voice?.lang ?? lang
  if (voice) u.voice = voice
  u.rate = o.rate ?? 1
  synth.speak(u)
  return true
}
