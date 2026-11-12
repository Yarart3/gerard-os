import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MODELS,
  anthropicRequest,
  extractAnthropicText,
  extractGeminiText,
  geminiRequest,
  providerError,
  stripFences,
} from '../../../../supabase/functions/_shared/ai.ts'

describe('proveedores de IA (lógica pura de la Edge Function)', () => {
  it('Gemini: generateContent con clave en cabecera y JSON', () => {
    const r = geminiRequest('m-1', 'KEY', { system: 's', prompt: 'p' })
    expect(r.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/m-1:generateContent')
    expect(r.headers['x-goog-api-key']).toBe('KEY')
    expect(r.body.generationConfig.responseMimeType).toBe('application/json')
  })
  it('Anthropic: Messages API y modelo por defecto', () => {
    expect(DEFAULT_MODELS.anthropic).toBe('claude-haiku-5-5')
    const r = anthropicRequest(DEFAULT_MODELS.anthropic, 'K', { system: 's', prompt: 'p' })
    expect(r.url).toBe('https://api.anthropic.com/v1/messages')
    expect(r.body.messages[0]).toEqual({ role: 'user', content: 'p' })
  })
  it('extrae el texto y quita vallas de código', () => {
    expect(extractGeminiText({ candidates: [{ content: { parts: [{ text: '```json\n{"a":1}\n```' }] } }] })).toBe('{"a":1}')
    expect(extractAnthropicText({ content: [{ type: 'text', text: '{"b":2}' }] })).toBe('{"b":2}')
    expect(extractGeminiText({ candidates: [] })).toBeNull()
    expect(stripFences('{"c":3}')).toBe('{"c":3}')
  })
  it('errores claros por estado HTTP', () => {
    expect(providerError('gemini', 429)).toMatch(/cuota/)
    expect(providerError('anthropic', 401)).toMatch(/clave/)
  })
})
