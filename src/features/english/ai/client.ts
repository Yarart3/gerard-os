import { supabase } from '../../../lib/supabase'

export type AiStatus = { providers: string[]; provider: string; model: string; used: number; limit: number }

async function invoke(action: 'status' | 'test', provider?: string) {
  const { data, error } = await supabase.functions.invoke<
    { ok: boolean; error?: string; reply?: string } & Partial<AiStatus>
  >('ai', { body: { action, provider } })
  if (error) {
    let msg = 'No se ha podido contactar con la función de IA'
    const ctx = (error as { context?: unknown }).context
    if (ctx instanceof Response) {
      try {
        const j = (await ctx.json()) as { error?: string }
        if (j.error) msg = j.error
      } catch {
        /* sin JSON */
      }
    }
    throw new Error(msg)
  }
  if (!data?.ok) throw new Error(data?.error ?? 'La IA no responde')
  return data
}

export const fetchAiStatus = async (): Promise<AiStatus> => (await invoke('status')) as unknown as AiStatus
export const testAi = (provider?: string) => invoke('test', provider)
