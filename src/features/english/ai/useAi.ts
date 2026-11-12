import { useCallback } from 'react'
import { useProfile } from '../api'
import { useEnglishSettings } from '../englishSettings'
import { DEFAULT_LEVEL, EMPTY_ANSWERS, type EnglishProfile } from '../profile'
import { runAi, type AiTask } from './run'

/** Acceso a la IA con el perfil y el proveedor del usuario. `run` lanza AiError si no hay IA o el JSON es inválido. */
export function useAi() {
  const profile = useProfile()
  const cfg = useEnglishSettings()
  const p: EnglishProfile = profile.data ?? { level: DEFAULT_LEVEL, answers: EMPTY_ANSWERS }
  const provider = cfg.value.ai_provider ?? undefined
  const run = useCallback(<T,>(task: AiTask<T>) => runAi(task, { provider }), [provider])
  return { profile: p, run }
}

export const aiMessage = (e: unknown) => (e instanceof Error ? e.message : 'La IA no está disponible')
