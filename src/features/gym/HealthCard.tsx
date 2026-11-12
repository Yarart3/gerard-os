import { useQuery } from '@tanstack/react-query'
import { Card, useToast } from '../../components/ui'
import { TIME_ZONE } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import s from './Gym.module.css'

/** URL pública de la Edge Function `health` (la protege el token, que nunca se muestra aquí). */
const healthUrl = () => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health`

const when = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short', timeZone: TIME_ZONE })

/** Último dato recibido de Apple Salud: derivado de `workouts.health_synced_at`. */
function useLastHealth() {
  return useQuery({
    queryKey: ['health-last'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select('health_synced_at')
        .not('health_synced_at', 'is', null)
        .order('health_synced_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data?.health_synced_at ?? null
    },
  })
}

export function HealthCard() {
  const last = useLastHealth()
  const toast = useToast()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(healthUrl())
      toast('URL copiada')
    } catch {
      toast('No se ha podido copiar', 'error')
    }
  }
  return (
    <Card title="Apple Salud">
      <div className={s.stack} style={{ gap: 10 }}>
        <p className={s.small} style={{ margin: 0 }}>
          Un Atajo de iOS envía tus entrenos del Apple Watch a esta URL y rellena las kcal del Watch de cada
          día. El token del Atajo se guarda solo en Supabase y en el Atajo: aquí no se muestra.
        </p>
        <p className={s.small} style={{ margin: 0 }}>
          Último dato recibido:{' '}
          {last.isLoading ? '…' : last.data ? when.format(new Date(last.data)) : 'todavía ninguno'}
        </p>
        <button type="button" className="btn btn-plain" onClick={copy}>
          Copiar URL
        </button>
      </div>
    </Card>
  )
}
