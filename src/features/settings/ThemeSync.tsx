import { useEffect } from 'react'
import { applyTheme } from './theme'
import { useGeneralSettings } from './useSettings'

/** Mantiene el tema de <html> sincronizado con el ajuste guardado en Supabase. */
export function ThemeSync() {
  const { value, isLoading } = useGeneralSettings()
  useEffect(() => {
    if (!isLoading) applyTheme(value.theme)
  }, [value.theme, isLoading])
  return null
}
