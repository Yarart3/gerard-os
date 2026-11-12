// Lógica pura de la Edge Function `ai` (sin Deno): construir peticiones y leer respuestas.
export type Provider = 'gemini' | 'anthropic'

// Modelo por defecto de Gemini: de nivel gratuito según la tabla de precios de Google AI (verificado 2026-11).
// Se cambia con el secret AI_MODEL sin tocar código.
export const DEFAULT_MODELS: Record<Provider, string> = {
  gemini: 'gemini-3.5-flash-lite',
  anthropic: 'claude-haiku-5-5',
}

export const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

export type AiRequest = { system: string; prompt: string; temperature?: number; maxTokens?: number }

export function parseProvider(v: string | null | undefined): Provider {
  return v === 'anthropic' ? 'anthropic' : 'gemini'
}

export function geminiRequest(model: string, apiKey: string, r: AiRequest) {
  return {
    url: `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: {
      systemInstruction: { parts: [{ text: r.system }] },
      contents: [{ role: 'user', parts: [{ text: r.prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: r.temperature ?? 0.7,
        ...(r.maxTokens ? { maxOutputTokens: r.maxTokens } : {}),
      },
    },
  }
}

export function anthropicRequest(model: string, apiKey: string, r: AiRequest) {
  return {
    url: ANTHROPIC_URL,
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: {
      model,
      max_tokens: r.maxTokens ?? 8192,
      temperature: r.temperature ?? 0.7,
      system: r.system,
      messages: [{ role: 'user', content: r.prompt }],
    },
  }
}

/** Quita ```json … ``` si el modelo lo añade. */
export function stripFences(text: string): string {
  const t = text.trim()
  const m = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t)
  return (m ? m[1]! : t).trim()
}

export function extractGeminiText(data: unknown): string | null {
  const d = data as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const parts = d?.candidates?.[0]?.content?.parts
  const text = parts?.map((p) => p.text ?? '').join('')
  return text ? stripFences(text) : null
}

export function extractAnthropicText(data: unknown): string | null {
  const d = data as { content?: { type?: string; text?: string }[] }
  const text = d?.content
    ?.filter((c) => c.type === 'text')
    .map((c) => c.text ?? '')
    .join('')
  return text ? stripFences(text) : null
}

/** Mensaje claro en castellano según el estado HTTP del proveedor. */
export function providerError(provider: Provider, status: number): string {
  const name = provider === 'gemini' ? 'Gemini' : 'Anthropic'
  if (status === 429) return `Se ha agotado la cuota de ${name} (inténtalo más tarde)`
  if (status === 401 || status === 403) return `La clave de ${name} no es válida o no tiene permiso`
  if (status === 404) return `El modelo configurado no existe en ${name} (revisa AI_MODEL)`
  if (status >= 500) return `${name} no está disponible ahora mismo`
  return `${name} rechazó la petición (${status})`
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
