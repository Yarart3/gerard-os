// Edge Function `ai`: proxy hacia Gemini (por defecto) o Anthropic, con límite diario y caché.
// POST JSON: { action: 'generate', system, prompt, temperature?, provider? } · { action: 'test' } · { action: 'status' }
// Secrets: GEMINI_API_KEY | ANTHROPIC_API_KEY, AI_PROVIDER (gemini|anthropic), AI_MODEL, AI_DAILY_LIMIT (def. 200).
// Siempre responde { ok, ... }; los errores llevan { ok:false, error, code }.
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  DEFAULT_MODELS,
  anthropicRequest,
  extractAnthropicText,
  extractGeminiText,
  geminiRequest,
  parseProvider,
  providerError,
  sha256Hex,
  type AiRequest,
  type Provider,
} from '../_shared/ai.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const MAX_PROMPT_CHARS = 60_000

class HandledError extends Error {
  constructor(
    message: string,
    public code: string,
    public status = 200,
  ) {
    super(message)
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const keyFor = (p: Provider) => Deno.env.get(p === 'gemini' ? 'GEMINI_API_KEY' : 'ANTHROPIC_API_KEY') ?? ''
const configured = (): Provider[] => (['gemini', 'anthropic'] as const).filter((p) => keyFor(p))
const modelFor = (p: Provider) => {
  const m = Deno.env.get('AI_MODEL')?.trim()
  // AI_MODEL aplica al proveedor por defecto; el otro usa su modelo por defecto.
  return m && p === parseProvider(Deno.env.get('AI_PROVIDER')) ? m : DEFAULT_MODELS[p]
}
const dailyLimit = () => Math.max(1, Number(Deno.env.get('AI_DAILY_LIMIT')) || 200)

function madridDay(): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  return p // YYYY-MM-DD
}

async function callProvider(provider: Provider, r: AiRequest): Promise<string> {
  const apiKey = keyFor(provider)
  if (!apiKey)
    throw new HandledError(
      `Falta el secret ${provider === 'gemini' ? 'GEMINI_API_KEY' : 'ANTHROPIC_API_KEY'} en Supabase`,
      'config',
    )
  const model = modelFor(provider)
  const req = provider === 'gemini' ? geminiRequest(model, apiKey, r) : anthropicRequest(model, apiKey, r)
  let res: Response
  try {
    res = await fetch(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(55_000),
    })
  } catch {
    throw new HandledError('El proveedor de IA no responde (sin red o tiempo agotado)', 'upstream')
  }
  if (!res.ok) {
    await res.body?.cancel()
    throw new HandledError(providerError(provider, res.status), res.status === 429 ? 'quota' : 'upstream')
  }
  const data = await res.json()
  const text = provider === 'gemini' ? extractGeminiText(data) : extractAnthropicText(data)
  if (!text) throw new HandledError('La IA devolvió una respuesta vacía o bloqueada', 'empty')
  return text
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido' }, 405)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return json({ ok: false, error: 'JSON no válido' }, 400)
    }
    const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: auth, error: authErr } = jwt ? await db.auth.getUser(jwt) : { data: null, error: new Error('sin token') }
    if (authErr || !auth?.user) return json({ ok: false, error: 'No autorizado' }, 401)
    const userId = auth.user.id

    const action = String(body.action ?? '')
    const available = configured()
    const defProvider = parseProvider(Deno.env.get('AI_PROVIDER'))
    const requested = body.provider === 'gemini' || body.provider === 'anthropic' ? body.provider : defProvider
    const provider: Provider = available.includes(requested) ? requested : (available[0] ?? requested)

    const day = madridDay()
    const usageRow = await db.from('ai_usage').select('requests').eq('user_id', userId).eq('day', day).maybeSingle()
    const used = (usageRow.data?.requests as number | undefined) ?? 0
    const limit = dailyLimit()
    const bump = async () => {
      await db.from('ai_usage').upsert({ user_id: userId, day, requests: used + 1 }, { onConflict: 'user_id,day' })
    }

    if (action === 'status') {
      return json({ ok: true, providers: available, provider: defProvider, model: modelFor(provider), used, limit })
    }

    if (action === 'test') {
      if (!available.length) throw new HandledError('No hay ninguna clave de IA configurada en los secrets de Supabase', 'config')
      if (used >= limit) throw new HandledError(`Límite diario de IA alcanzado (${limit} peticiones)`, 'limit')
      await bump()
      const text = await callProvider(provider, {
        system: 'Reply with strict JSON only.',
        prompt: 'Return {"pong": true}',
        temperature: 0,
        maxTokens: 50,
      })
      return json({ ok: true, provider, model: modelFor(provider), reply: text.slice(0, 80) })
    }

    if (action === 'generate') {
      const system = typeof body.system === 'string' ? body.system : ''
      const prompt = typeof body.prompt === 'string' ? body.prompt : ''
      if (!prompt.trim() || prompt.length + system.length > MAX_PROMPT_CHARS)
        return json({ ok: false, error: 'Petición vacía o demasiado larga', code: 'bad_request' }, 400)
      const temperature = typeof body.temperature === 'number' ? Math.min(1.5, Math.max(0, body.temperature)) : undefined
      const model = modelFor(provider)
      const hash = await sha256Hex(`${provider}\n${model}\n${temperature ?? ''}\n${system}\n${prompt}`)

      const cached = await db.from('ai_cache').select('response').eq('user_id', userId).eq('hash', hash).maybeSingle()
      if (cached.data?.response) {
        return json({ ok: true, text: cached.data.response, cached: true, provider, model, used, limit })
      }
      if (!available.length) throw new HandledError('No hay ninguna clave de IA configurada en los secrets de Supabase', 'config')
      if (used >= limit) throw new HandledError(`Límite diario de IA alcanzado (${limit} peticiones)`, 'limit')
      await bump()
      const text = await callProvider(provider, { system, prompt, temperature })
      // Solo se cachea si es JSON parseable (una respuesta rota no debe repetirse).
      try {
        JSON.parse(text)
        await db.from('ai_cache').upsert({ user_id: userId, hash, provider, model, response: text }, { onConflict: 'user_id,hash' })
      } catch {
        /* no se cachea */
      }
      return json({ ok: true, text, cached: false, provider, model, used: used + 1, limit })
    }

    return json({ ok: false, error: 'Acción desconocida' }, 400)
  } catch (e) {
    if (e instanceof HandledError) return json({ ok: false, error: e.message, code: e.code }, e.status)
    console.error('ai error:', e instanceof Error ? e.message : String(e))
    return json({ ok: false, error: e instanceof Error ? e.message : 'Error interno', code: 'internal' }, 500)
  }
})
