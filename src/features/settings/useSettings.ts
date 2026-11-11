import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Json } from '../../lib/database.types'
import type { ThemePref } from './theme'

export type SettingsSection = 'general' | 'today' | 'gym' | 'agenda' | 'english' | 'personal'

export type GeneralSettings = {
  theme: ThemePref
  profile: {
    name: string
    weight_kg: number | null
    height_cm: number | null
    birth_date: string | null // YYYY-MM-DD
  }
}

export const GENERAL_DEFAULTS: GeneralSettings = {
  theme: 'system',
  profile: { name: '', weight_kg: null, height_cm: null, birth_date: null },
}

/** Ajustes de una sección (fila de `settings`), fusionados con sus valores por defecto. */
export function useSectionSettings<T extends object>(section: SettingsSection, defaults: T) {
  const qc = useQueryClient()
  const key = ['settings', section]

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('data')
        .eq('section', section)
        .maybeSingle()
      if (error) throw error
      return (data?.data ?? {}) as Partial<T>
    },
  })

  const mutation = useMutation({
    mutationFn: async (next: T) => {
      const { error } = await supabase
        .from('settings')
        .upsert({ section, data: next as unknown as Json }, { onConflict: 'user_id,section' })
      if (error) throw error
    },
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData(key)
      qc.setQueryData(key, next)
      return { previous }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })

  const value = { ...defaults, ...query.data } as T
  return {
    value,
    isLoading: query.isLoading,
    error: query.error,
    save: mutation.mutateAsync,
    saving: mutation.isPending,
  }
}

export const useGeneralSettings = () => useSectionSettings<GeneralSettings>('general', GENERAL_DEFAULTS)
