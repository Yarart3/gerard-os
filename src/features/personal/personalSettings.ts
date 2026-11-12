import { useSectionSettings } from '../settings/useSettings'

export type PersonalSettings = {
  watch_platforms: string[] // plataformas sugeridas de la watchlist
  note_tags: string[] // etiquetas sugeridas para las notas
}

export const PERSONAL_DEFAULTS: PersonalSettings = {
  watch_platforms: ['Netflix', 'HBO Max', 'Disney+', 'Prime Video', 'Filmin', 'Cine', 'Papel', 'Kindle'],
  note_tags: [],
}

export function usePersonalSettings() {
  const s = useSectionSettings<PersonalSettings>('personal', PERSONAL_DEFAULTS)
  return { ...s, value: { ...PERSONAL_DEFAULTS, ...s.value } }
}
