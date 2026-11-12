import type { ZodType } from 'zod'
import { onlineManager } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export type AiTask<T> = { system: string; prompt: string; schema: ZodType<T>; temperature?: number }

export type AiReply = { ok: boolean; text?: string; error?: string; code?: string; [k: string]: unknown }
export type AiCall = (req: { action: string; system?: string; prompt?: string; temperature?: number; provider?: string }) => Promise<AiReply>

export class AiError extends Error {
  constructor(
    message: string,
    public code: 'unavailable' | 'invalid' = 'unavailable',
  ) {
    super(message)
  }
}

/** Llama a la Edge Function `ai`. Devuelve siempre { ok, ... } (nunca lanza por errores de la función). */
export const callAi: AiCall = async (req) => {
  if (!onlineManager.isOnline()) return { ok: false, error: 'Necesita conexión' }
  const { data, error } = await supabase.functions.invoke<AiReply>('ai', { body: req })
  if (error) {
    let msg = 'No se ha podido contactar con la IA (¿sin red?)'
    const ctx = (error as { context?: unknown }).context
    if (ctx instanceof Response) {
      try {
        const j = (await ctx.json()) as { error?: string }
        if (j.error) msg = j.error
      } catch {
        /* sin cuerpo JSON */
      }
    }
    return { ok: false, error: msg }
  }
  return data ?? { ok: false, error: 'Respuesta vacía de la IA' }
}

function tryParse<T>(text: string, schema: ZodType<T>): { ok: true; value: T } | { ok: false; error: string } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${e instanceof Error ? e.message : 'parse error'}` }
  }
  const r = schema.safeParse(raw)
  if (r.success) return { ok: true, value: r.data }
  const issues = r.error.issues
    .slice(0, 6)
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('; ')
  return { ok: false, error: `Schema validation failed: ${issues}` }
}

/**
 * Pide JSON estricto a la IA y lo valida con Zod. Si no valida, reintenta UNA vez enviando el error.
 * Lanza AiError('unavailable') si la IA no responde y AiError('invalid') si sigue inválido tras el reintento.
 */
export async function runAi<T>(task: AiTask<T>, opts: { provider?: string; call?: AiCall } = {}): Promise<T> {
  const call = opts.call ?? callAi
  const ask = async (prompt: string) => {
    const r = await call({ action: 'generate', system: task.system, prompt, temperature: task.temperature, provider: opts.provider })
    if (!r.ok || typeof r.text !== 'string') throw new AiError(r.error ?? 'La IA no está disponible', 'unavailable')
    return r.text
  }
  const first = tryParse(await ask(task.prompt), task.schema)
  if (first.ok) return first.value
  const retry = `${task.prompt}\n\nYour previous reply was rejected. ${first.error}\nReturn ONLY corrected strict JSON that follows the schema exactly.`
  const second = tryParse(await ask(retry), task.schema)
  if (second.ok) return second.value
  throw new AiError('La IA devolvió un formato inválido dos veces; inténtalo de nuevo', 'invalid')
}
