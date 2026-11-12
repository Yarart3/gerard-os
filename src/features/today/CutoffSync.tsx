import { useEffect } from 'react'
import { setDayCutoff } from '../../lib/dates'
import { cutoffMinutes, useTodaySettings } from './todaySettings'

/** Mantiene la hora de corte del día (helper central de fechas) sincronizada con el ajuste guardado. */
export function CutoffSync() {
  const { value, isLoading } = useTodaySettings()
  useEffect(() => {
    if (!isLoading) setDayCutoff(cutoffMinutes(value.cutoff))
  }, [value.cutoff, isLoading])
  return null
}
