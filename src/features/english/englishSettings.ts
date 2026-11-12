import { useSectionSettings } from '../settings/useSettings'

export type EnglishSettings = {
  daily_goal: number | null // puntos al día; null = según los minutos del perfil
  voice_uri: string | null // voz de speechSynthesis; null = automática
  speed: number // 0,6 · 0,8 · 1 · 1,2
  ai_provider: string | null // null = el de los secrets
}

export const ENGLISH_DEFAULTS: EnglishSettings = { daily_goal: null, voice_uri: null, speed: 1, ai_provider: null }

export function useEnglishSettings() {
  const s = useSectionSettings<EnglishSettings>('english', ENGLISH_DEFAULTS)
  return { ...s, value: { ...ENGLISH_DEFAULTS, ...s.value } }
}

/** Objetivo diario: el de Ajustes o ~3 puntos por minuto de estudio del perfil. */
export const goalFor = (goal: number | null, minutes: number) => goal ?? Math.max(10, Math.round(minutes * 3))
